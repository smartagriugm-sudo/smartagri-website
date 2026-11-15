// The plant factory camera as the ERP sees it: a ticket from /api/cctv/ticket,
// then live video over a WebSocket from the gateway on the bridge PC
// (docs/setup/SETUP-CCTV.md). Kept free of React so it can be tested.

import { getAccessToken } from "../auth/supabase";

export type CctvQuality = "sd" | "hd";
export type PtzDir = "left" | "right" | "up" | "down" | "stop";

export const CCTV_STREAMS: Record<CctvQuality, string> = { sd: "plant_factory_sd", hd: "plant_factory" };
export const CCTV_QUALITY_LABEL: Record<CctvQuality, string> = { sd: "SD 640×360", hd: "HD 1080p" };

export interface CctvTicket {
  base: string;
  ticket: string;
  expiresAt: number;
}

/** Codecs go2rtc may send over MSE, in its own spelling; the browser keeps the ones it plays. */
const CODEC_CANDIDATES: [string, string][] = [
  ["avc1.640029", 'video/mp4; codecs="avc1.640029"'],
  ["avc1.64002A", 'video/mp4; codecs="avc1.64002A"'],
  ["avc1.640033", 'video/mp4; codecs="avc1.640033"'],
  ["hvc1.1.6.L153.B0", 'video/mp4; codecs="hvc1.1.6.L153.B0"'],
  ["mp4a.40.2", 'video/mp4; codecs="mp4a.40.2"'],
  ["mp4a.40.5", 'video/mp4; codecs="mp4a.40.5"'],
  ["flac", 'video/mp4; codecs="flac"'],
  ["opus", 'video/mp4; codecs="opus"'],
];

export function mseCodecs(isSupported: (mime: string) => boolean): string {
  return CODEC_CANDIDATES.filter(([, mime]) => isSupported(mime)).map(([name]) => name).join(",");
}

/** A ticket is used until 30 s before it runs out. */
export function ticketFresh(t: CctvTicket | null, now = Date.now()): t is CctvTicket {
  return !!t && t.expiresAt - now > 30_000;
}

export function streamUrl(t: CctvTicket, quality: CctvQuality): string {
  const ws = t.base.replace(/^http/, "ws");
  return `${ws}/api/ws?src=${CCTV_STREAMS[quality]}&t=${encodeURIComponent(t.ticket)}`;
}

export function frameUrl(t: CctvTicket, quality: CctvQuality): string {
  return `${t.base}/api/frame.jpeg?src=${CCTV_STREAMS[quality]}&t=${encodeURIComponent(t.ticket)}`;
}

export class CctvError extends Error {
  constructor(message: string, readonly kind: "not_set_up" | "not_allowed" | "offline") {
    super(message);
  }
}

export async function fetchTicket(): Promise<CctvTicket> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch("/api/cctv/ticket", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new CctvError("The site could not be reached.", "offline");
  }
  const body = (await res.json().catch(() => ({}))) as Partial<CctvTicket> & { error?: string };
  if (res.status === 503) throw new CctvError(body.error ?? "The camera is not set up yet.", "not_set_up");
  if (!res.ok || !body.base || !body.ticket || !body.expiresAt) throw new CctvError(body.error ?? "The camera pass was refused.", "not_allowed");
  return { base: body.base, ticket: body.ticket, expiresAt: body.expiresAt };
}

export async function movePtz(t: CctvTicket, dir: PtzDir): Promise<void> {
  const res = await fetch(`${t.base}/api/ptz?t=${encodeURIComponent(t.ticket)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dir }),
  });
  if (!res.ok) throw new CctvError("The camera did not answer.", "offline");
}
