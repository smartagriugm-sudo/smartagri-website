// smartagri CCTV gateway: the only door from the internet to the camera.
//
// It runs on the bridge PC next to go2rtc and lets through only:
//   GET  /health                       is the gateway up (no ticket needed)
//   WS   /api/ws?src=<stream>&t=<tk>   live video from go2rtc (MSE over WebSocket)
//   GET  /api/frame.jpeg?src=..&t=..   one still frame
//   POST /api/ptz?t=..  {"dir": "left" | "right" | "up" | "down" | "stop"}
// A ticket comes from the ERP (POST /api/cctv/ticket) after it has checked the
// user's login; it is "<expiry unix seconds>.<HMAC-SHA256 hex>" signed with the
// shared CCTV_SECRET. go2rtc's own API (which shows the camera password) is
// never reachable from outside.
//
// No dependencies: Node 18 or newer. Run it with:
//   node cctv-gateway.mjs
// Settings come from files next to this one (or the folder in CCTV_DIR):
//   secret.yaml       go2rtc streams with the camera address and password
//   cctv-secret.txt   the shared CCTV_SECRET (same value as on Vercel)

import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = process.env.CCTV_DIR || path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CCTV_PORT || 1985);
const GO2RTC = { host: "127.0.0.1", port: Number(process.env.GO2RTC_PORT || 1984) };
const STREAMS = new Set(["plant_factory", "plant_factory_sd"]);
const ORIGINS = (process.env.CCTV_ORIGINS || "https://www.smart-agri.id,https://smart-agri.id,http://localhost:3000")
  .split(",").map((s) => s.trim()).filter(Boolean);
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

const SECRET = readFileSync(path.join(DIR, "cctv-secret.txt"), "utf8").trim();
if (SECRET.length < 32) throw new Error("cctv-secret.txt must hold at least 32 characters");

// The camera's address and login, read from the main stream in secret.yaml.
const camLine = readFileSync(path.join(DIR, "secret.yaml"), "utf8").split(/\r?\n/).find((l) => /^\s*plant_factory:/.test(l));
const cam = camLine?.match(/rtsp:\/\/([^:]+):(.*)@([\d.]+):/);
if (!cam) throw new Error("secret.yaml has no plant_factory stream");
const CAM = { user: decodeURIComponent(cam[1]), pass: decodeURIComponent(cam[2]), host: cam[3], onvifPort: Number(process.env.ONVIF_PORT || 8000) };

/* ---------------------------------------------------------------- tickets */

function validTicket(t) {
  const m = typeof t === "string" ? t.match(/^(\d{10})\.([0-9a-f]{64})$/) : null;
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  const want = createHmac("sha256", SECRET).update(m[1]).digest();
  return timingSafeEqual(want, Buffer.from(m[2], "hex"));
}

function allowedOrigin(origin) {
  return !!origin && (ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin));
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

/* ------------------------------------------------------------------ ONVIF PTZ */

function soap(body) {
  const nonce = randomBytes(16);
  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const digest = createHash("sha1").update(Buffer.concat([nonce, Buffer.from(created + CAM.pass)])).digest("base64");
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:tt="http://www.onvif.org/ver10/schema"><s:Header><Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><UsernameToken><Username>${CAM.user}</Username><Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</Password><Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce.toString("base64")}</Nonce><Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${created}</Created></UsernameToken></Security></s:Header><s:Body>${body}</s:Body></s:Envelope>`;
}

async function onvif(service, body) {
  const res = await fetch(`http://${CAM.host}:${CAM.onvifPort}/onvif/${service}`, {
    method: "POST",
    headers: { "Content-Type": "application/soap+xml" },
    body: soap(body),
    signal: AbortSignal.timeout(5000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ONVIF ${service} ${res.status}`);
  return text;
}

let profileToken = null;
async function profile() {
  if (!profileToken) {
    const xml = await onvif("media_service", "<trt:GetProfiles/>");
    profileToken = xml.match(/Profiles[^>]*token="([^"]+)"/)?.[1] ?? null;
    if (!profileToken) throw new Error("camera has no media profile");
  }
  return profileToken;
}

const MOVES = { left: [-0.5, 0], right: [0.5, 0], up: [0, 0.5], down: [0, -0.5] };
let stopTimer = null;

async function ptz(dir) {
  const token = await profile();
  clearTimeout(stopTimer);
  if (dir === "stop") {
    await onvif("ptz_services", `<tptz:Stop><tptz:ProfileToken>${token}</tptz:ProfileToken><tptz:PanTilt>true</tptz:PanTilt><tptz:Zoom>true</tptz:Zoom></tptz:Stop>`);
    return;
  }
  const [x, y] = MOVES[dir];
  await onvif("ptz_services", `<tptz:ContinuousMove><tptz:ProfileToken>${token}</tptz:ProfileToken><tptz:Velocity><tt:PanTilt x="${x}" y="${y}"/></tptz:Velocity></tptz:ContinuousMove>`);
  // A lost "stop" must never leave the camera turning: stop on our own after 1.5 s.
  stopTimer = setTimeout(() => void ptz("stop").catch(() => {}), 1500);
}

/* ---------------------------------------------------------------- the server */

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, "http://gateway");
  if (req.method === "OPTIONS") return res.writeHead(allowedOrigin(req.headers.origin) ? 204 : 403).end();
  if (url.pathname === "/health") return send(res, 200, { ok: true });
  if (!validTicket(url.searchParams.get("t"))) return send(res, 401, { error: "ticket missing or expired" });

  if (req.method === "GET" && url.pathname === "/api/frame.jpeg") {
    const src = url.searchParams.get("src");
    if (!STREAMS.has(src)) return send(res, 404, { error: "unknown stream" });
    const up = http.get({ ...GO2RTC, path: `/api/frame.jpeg?src=${src}` }, (r) => {
      res.writeHead(r.statusCode ?? 502, { "Content-Type": r.headers["content-type"] ?? "image/jpeg", "Cache-Control": "no-store" });
      r.pipe(res);
    });
    up.on("error", () => send(res, 502, { error: "go2rtc is not running" }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ptz") {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 200) req.destroy(); });
    req.on("end", async () => {
      let dir;
      try { dir = JSON.parse(raw).dir; } catch { /* bad body */ }
      if (dir !== "stop" && !(dir in MOVES)) return send(res, 400, { error: "dir must be left, right, up, down or stop" });
      try {
        await ptz(dir);
        send(res, 200, { ok: true });
      } catch (e) {
        send(res, 502, { error: e instanceof Error ? e.message : "camera did not answer" });
      }
    });
    return;
  }

  send(res, 404, { error: "not found" });
});

// Live video: check the ticket and stream name, then hand the raw socket to go2rtc.
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://gateway");
  const src = url.searchParams.get("src");
  const ok = url.pathname === "/api/ws" && STREAMS.has(src) && validTicket(url.searchParams.get("t")) && allowedOrigin(req.headers.origin);
  if (!ok) {
    socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    return;
  }
  const upstream = net.connect(GO2RTC, () => {
    const headers = Object.entries(req.headers)
      .filter(([k]) => !["host", "origin", "cookie", "authorization"].includes(k))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
    upstream.write([`GET /api/ws?src=${src} HTTP/1.1`, `host: ${GO2RTC.host}:${GO2RTC.port}`, ...headers, "", ""].join("\r\n"));
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  const close = () => { upstream.destroy(); socket.destroy(); };
  upstream.on("error", close);
  socket.on("error", close);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`cctv gateway on http://127.0.0.1:${PORT} -> go2rtc ${GO2RTC.host}:${GO2RTC.port}, camera ${CAM.host}`);
});
