import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Maximize2, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { CCTV_QUALITY_LABEL, CctvError, fetchTicket, movePtz, mseCodecs, streamUrl, ticketFresh, type CctvQuality, type CctvTicket, type PtzDir } from "../../lib/pf/cctv";
import { Segmented } from "./ui";

// Live view of the plant factory camera (Bardi IDR-IPC-PTZ) on the ERP's front page.
// Video comes as fMP4 over a WebSocket from go2rtc, through the gateway on the
// bridge PC, and plays with Media Source Extensions (ManagedMediaSource on iPhone).
// It stops while the tab is hidden, so an open dashboard costs no data in the
// background. Setup: docs/setup/SETUP-CCTV.md.

type Phase = "connecting" | "live" | "paused" | "offline" | "not_set_up" | "not_allowed";

const RETRY_MS = [2000, 5000, 10000, 20000];
const MAX_LAG_S = 1.5;

type MediaSourceCtor = typeof MediaSource;

function mediaSourceCtor(): { Ctor: MediaSourceCtor; managed: boolean } | null {
  const w = window as unknown as { ManagedMediaSource?: MediaSourceCtor; MediaSource?: MediaSourceCtor };
  if (w.ManagedMediaSource) return { Ctor: w.ManagedMediaSource, managed: true };
  if (w.MediaSource) return { Ctor: w.MediaSource, managed: false };
  return null;
}

/** Plays one WebSocket stream into the video element; returns a function that stops it. */
function play(video: HTMLVideoElement, url: string, on: { live: () => void; closed: () => void }): () => void {
  const found = mediaSourceCtor();
  if (!found) {
    on.closed();
    return () => {};
  }
  const ms = new found.Ctor();
  let ws: WebSocket | null = null;
  let sb: SourceBuffer | null = null;
  let queue: Uint8Array[] = [];
  let stopped = false;
  let objectUrl: string | null = null;

  const append = () => {
    if (!sb || sb.updating || queue.length === 0) return;
    const size = queue.reduce((n, b) => n + b.byteLength, 0);
    const chunk = new Uint8Array(size);
    let at = 0;
    for (const b of queue) {
      chunk.set(b, at);
      at += b.byteLength;
    }
    queue = [];
    try {
      sb.appendBuffer(chunk);
    } catch {
      stop();
      on.closed();
    }
  };

  const keepLive = () => {
    if (!sb || sb.updating || sb.buffered.length === 0) return;
    const end = sb.buffered.end(sb.buffered.length - 1);
    const start = sb.buffered.start(0);
    if (end - start > 20) {
      sb.remove(start, end - 10);
      return;
    }
    if (end - video.currentTime > MAX_LAG_S) video.currentTime = Math.max(start, end - 0.3);
  };

  ms.addEventListener(
    "sourceopen",
    () => {
      if (stopped) return;
      ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => ws?.send(JSON.stringify({ type: "mse", value: mseCodecs((m) => found.Ctor.isTypeSupported(m)) }));
      ws.onmessage = (ev) => {
        if (typeof ev.data === "string") {
          const msg = JSON.parse(ev.data) as { type: string; value: string };
          if (msg.type === "mse" && !sb) {
            sb = ms.addSourceBuffer(msg.value);
            sb.mode = "segments";
            sb.addEventListener("updateend", () => {
              if (queue.length) append();
              else keepLive();
            });
          } else if (msg.type === "error") {
            stop();
            on.closed();
          }
          return;
        }
        queue.push(new Uint8Array(ev.data as ArrayBuffer));
        append();
        if (video.paused) void video.play().then(on.live, () => {});
        else on.live();
      };
      ws.onclose = () => {
        if (!stopped) {
          stop();
          on.closed();
        }
      };
    },
    { once: true },
  );

  if (found.managed) {
    video.disableRemotePlayback = true;
    video.srcObject = ms as unknown as MediaProvider;
  } else {
    objectUrl = URL.createObjectURL(ms);
    video.srcObject = null;
    video.src = objectUrl;
  }

  function stop() {
    stopped = true;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    video.removeAttribute("src");
    video.srcObject = null;
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
  return stop;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

const STATUS: Record<Phase, { label: string; color: string }> = {
  connecting: { label: "Connecting…", color: "#E0A526" },
  live: { label: "Live", color: "#E5484D" },
  paused: { label: "Paused while the tab is hidden", color: "#8AA3A9" },
  offline: { label: "Camera offline", color: "#8AA3A9" },
  not_set_up: { label: "Not set up", color: "#8AA3A9" },
  not_allowed: { label: "No access", color: "#8AA3A9" },
};

export default function CctvPanel({ canControl }: { canControl: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<CctvTicket | null>(null);
  const [quality, setQuality] = useState<CctvQuality>("sd");
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ptzError, setPtzError] = useState(false);
  const visible = usePageVisible();

  const ticket = useCallback(async () => {
    if (!ticketFresh(ticketRef.current)) ticketRef.current = await fetchTicket();
    return ticketRef.current;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!visible) {
      setPhase("paused");
      return;
    }
    let stop: (() => void) | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    setPhase("connecting");
    setMessage(null);

    ticket()
      .then((t) => {
        if (cancelled) return;
        stop = play(video, streamUrl(t, quality), {
          live: () => !cancelled && setPhase("live"),
          closed: () => {
            if (cancelled) return;
            setPhase("offline");
            setMessage("The camera or the bridge PC is not answering. Trying again…");
            retry = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
          },
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const kind = e instanceof CctvError ? e.kind : "offline";
        setPhase(kind === "offline" ? "offline" : kind);
        setMessage(e instanceof Error ? e.message : "The camera could not be opened.");
        if (kind === "offline") retry = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
      });

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      stop?.();
    };
  }, [quality, visible, attempt, ticket]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const move = (dir: PtzDir) => {
    void ticket()
      .then((t) => movePtz(t, dir))
      .then(() => setPtzError(false), () => setPtzError(true));
  };

  const fullscreen = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
    else (videoRef.current as unknown as { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
  };

  const status = STATUS[phase];
  const showVideo = phase === "live" || phase === "connecting";

  return (
    <section className="rounded-xl border border-[#DCE7E8] bg-white" aria-labelledby="cctv-title">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div ref={frameRef} className="relative m-3 aspect-video overflow-hidden rounded-lg bg-[#08313A] lg:mr-0">
          <video ref={videoRef} className={`h-full w-full object-contain ${showVideo ? "" : "invisible"}`} muted autoPlay playsInline aria-label="Live video from the plant factory camera" />
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#08313A]/80 px-2.5 py-1 text-[12px] font-medium text-white" role="status">
            <span className={`h-2 w-2 rounded-full ${phase === "live" ? "motion-safe:animate-pulse" : ""}`} style={{ background: status.color }} aria-hidden="true" />
            {status.label}
          </span>
          {phase === "connecting" && <p className="absolute inset-0 flex items-center justify-center text-[14px] text-[#CFE3E6]">Opening the camera…</p>}
          {!showVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="max-w-[420px] text-[14px] leading-[1.5] text-[#CFE3E6]">
                {phase === "paused" ? "The video resumes when you come back to this tab." : message ?? "The camera could not be opened."}
              </p>
              {(phase === "offline" || phase === "not_allowed") && (
                <button
                  type="button"
                  onClick={() => {
                    ticketRef.current = null;
                    setAttempt((n) => n + 1);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#45DFB1] px-3.5 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99] lg:min-h-[36px]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 px-4 pb-4 lg:py-3">
          <div>
            <h2 id="cctv-title" className="text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]">Plant factory camera</h2>
            <p className="mt-0.5 text-[13px] leading-[1.5] text-[#4F6B73]">PF01 · Bardi IDR-IPC-PTZ. Only signed-in ERP users can watch.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={quality} options={(["sd", "hd"] as const).map((k) => ({ key: k, label: CCTV_QUALITY_LABEL[k] }))} onChange={setQuality} />
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={!muted}
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#DCE7E8] text-[#0B6477] hover:bg-[#EEF3F4] lg:h-8 lg:w-8"
            >
              {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={fullscreen}
              aria-label="Show the video full screen"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#DCE7E8] text-[#0B6477] hover:bg-[#EEF3F4] lg:h-8 lg:w-8"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {canControl && (
            <div>
              <p className="text-[13px] font-medium text-[#4F6B73]">Turn the camera</p>
              <div className="mt-2 grid w-[148px] grid-cols-3 gap-1.5" role="group" aria-label="Turn the camera">
                <PtzButton dir="up" label="Turn up" onMove={move} className="col-start-2"><ChevronUp className="h-5 w-5" aria-hidden="true" /></PtzButton>
                <PtzButton dir="left" label="Turn left" onMove={move} className="col-start-1 row-start-2"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></PtzButton>
                <PtzButton dir="right" label="Turn right" onMove={move} className="col-start-3 row-start-2"><ChevronRight className="h-5 w-5" aria-hidden="true" /></PtzButton>
                <PtzButton dir="down" label="Turn down" onMove={move} className="col-start-2 row-start-3"><ChevronDown className="h-5 w-5" aria-hidden="true" /></PtzButton>
              </div>
              <p className="mt-2 text-[12px] leading-[1.5] text-[#4F6B73]">{ptzError ? "The camera did not take the command. Try again in a moment." : "Hold an arrow to turn, let go to stop."}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PtzButton({ dir, label, onMove, className, children }: { dir: Exclude<PtzDir, "stop">; label: string; onMove: (d: PtzDir) => void; className: string; children: React.ReactNode }) {
  const held = useRef(false);
  const start = () => {
    if (held.current) return;
    held.current = true;
    onMove(dir);
  };
  const end = () => {
    if (!held.current) return;
    held.current = false;
    onMove("stop");
  };
  const keys: Record<string, PtzDir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter" || keys[e.key] === dir) && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={end}
      onBlur={end}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex h-11 w-11 touch-none select-none items-center justify-center rounded-lg border border-[#DCE7E8] text-[#0B6477] hover:bg-[#EEF3F4] active:bg-[#DDF7EC] ${className}`}
    >
      {children}
    </button>
  );
}
