import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Maximize2, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { CCTV_QUALITY_LABEL, CctvError, fetchTicket, movePtz, mseCodecs, streamUrl, ticketFresh, type CctvFeed, type CctvQuality, type CctvTicket, type PtzDir } from "../../lib/pf/cctv";
import { useErpAccess } from "./page";

// The plant factory camera (Bardi IDR-IPC-PTZ), shown where the camera sits in the 3D
// model: a small live view on the floating card, and a fuller one with controls in the
// model's camera panel. Video is fMP4 over a WebSocket from go2rtc, through the gateway
// on the bridge PC, played with Media Source Extensions (ManagedMediaSource on iPhone).
// It stops while the tab is hidden. Setup: docs/setup/SETUP-CCTV.md.

export type CctvPhase = "connecting" | "live" | "paused" | "offline" | "not_set_up" | "not_allowed";

const RETRY_MS = [2000, 5000, 10000, 20000];
const MAX_LAG_S = 1.5;
const FIRST_PICTURE_MS = 12_000;
const STALL_MS = 10_000;

/* ---------------------------------------------------------------- the ticket */

// One ticket serves every view on the page, and only one request is ever in flight.
let shared: CctvTicket | null = null;
let pending: Promise<CctvTicket> | null = null;

function ticket(fresh = false): Promise<CctvTicket> {
  if (fresh) shared = null;
  if (ticketFresh(shared)) return Promise.resolve(shared);
  pending ??= fetchTicket()
    .then((t) => (shared = t))
    .finally(() => (pending = null));
  return pending;
}

/* ---------------------------------------------------------------- the player */

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
    // Callers expect a stop function back first; report the failure right after.
    queueMicrotask(on.closed);
    return () => {};
  }
  const ms = new found.Ctor();
  let ws: WebSocket | null = null;
  let sb: SourceBuffer | null = null;
  let queue: Uint8Array[] = [];
  let stopped = false;
  let objectUrl: string | null = null;
  // go2rtc answers, and even sends the stream header, when the camera does not. So the
  // picture counts as live only once the video plays on, and a stall means offline.
  let lastFrame = Date.now();
  let live = false;
  const watchdog = setInterval(() => {
    if (Date.now() - lastFrame > (live ? STALL_MS : FIRST_PICTURE_MS)) {
      stop();
      on.closed();
    }
  }, 2000);
  const onTime = () => {
    lastFrame = Date.now();
    if (!live && video.currentTime > 0) {
      live = true;
      on.live();
    }
  };
  video.addEventListener("timeupdate", onTime);

  const append = () => {
    if (!sb || sb.updating || queue.length === 0) return;
    const chunk = new Uint8Array(queue.reduce((n, b) => n + b.byteLength, 0));
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
            sb.addEventListener("updateend", () => (queue.length ? append() : keepLive()));
          } else if (msg.type === "error") {
            stop();
            on.closed();
          }
          return;
        }
        queue.push(new Uint8Array(ev.data as ArrayBuffer));
        append();
        if (video.paused) void video.play().catch(() => {});
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
    clearInterval(watchdog);
    video.removeEventListener("timeupdate", onTime);
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

/** Keeps a video element playing the camera, reconnecting after a drop. */
function useCctvStream(video: React.RefObject<HTMLVideoElement | null>, quality: CctvQuality) {
  const [phase, setPhase] = useState<CctvPhase>("connecting");
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const visible = usePageVisible();
  // A retry on its own keeps saying "offline" until a picture comes, rather than
  // flickering back to "connecting" every few seconds.
  const quietRetry = useRef(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (!visible) {
      setPhase("paused");
      return;
    }
    let stop: (() => void) | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const again = () =>
      (retry = setTimeout(() => {
        quietRetry.current = true;
        setAttempt((n) => n + 1);
      }, RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]));
    if (!quietRetry.current) {
      setPhase("connecting");
      setMessage(null);
    }
    quietRetry.current = false;

    ticket()
      .then((t) => {
        if (cancelled) return;
        stop = play(el, streamUrl(t, quality), {
          live: () => !cancelled && setPhase("live"),
          closed: () => {
            if (cancelled) return;
            setPhase("offline");
            setMessage("The camera is not answering. It may be off, or the bridge PC is on another network. Trying again…");
            again();
          },
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const kind = e instanceof CctvError ? e.kind : "offline";
        setPhase(kind);
        setMessage(e instanceof Error ? e.message : "The camera could not be opened.");
        if (kind === "offline") again();
      });

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      stop?.();
    };
  }, [video, quality, visible, attempt]);

  const retry = () => {
    shared = null;
    setAttempt((n) => n + 1);
  };
  return { phase, message, retry };
}

/* ------------------------------------------------------------------- the view */

const STATUS: Record<CctvPhase, { label: string; color: string }> = {
  connecting: { label: "Connecting", color: "#E0A526" },
  live: { label: "Live", color: "#E5484D" },
  paused: { label: "Paused", color: "#8AA3A9" },
  offline: { label: "Offline", color: "#8AA3A9" },
  not_set_up: { label: "Not set up", color: "#8AA3A9" },
  not_allowed: { label: "No access", color: "#8AA3A9" },
};

const iconButton = "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#DCE7E8] bg-white text-[#0B6477] hover:bg-[#EEF3F4] lg:h-8 lg:w-8";

/**
 * The live picture of one camera. `compact` is the small view on the floating card:
 * no controls, no retry button, a smaller status chip.
 */
export function CctvLive({ feed, quality = "sd", muted = true, compact = false, frame }: { feed: CctvFeed; quality?: CctvQuality; muted?: boolean; compact?: boolean; frame?: React.RefObject<HTMLDivElement | null> }) {
  const video = useRef<HTMLVideoElement>(null);
  const { phase, message, retry } = useCctvStream(video, quality);
  const status = STATUS[phase];
  const showVideo = phase === "live" || phase === "connecting";

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  return (
    <div ref={frame} className="relative aspect-video overflow-hidden rounded-lg bg-[#08313A]">
      <video ref={video} className={`h-full w-full object-contain ${showVideo ? "" : "invisible"}`} muted autoPlay playsInline aria-label={`Live video, ${feed.label}`} />
      <span className={`absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-[#08313A]/80 font-medium text-white ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"}`}>
        <span className={`h-2 w-2 rounded-full ${phase === "live" ? "motion-safe:animate-pulse" : ""}`} style={{ background: status.color }} aria-hidden="true" />
        {status.label}
      </span>
      {phase === "connecting" && <p className="absolute inset-0 flex items-center justify-center text-[13px] text-[#CFE3E6]">Opening the camera…</p>}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
          <p className={`max-w-[360px] leading-[1.45] text-[#CFE3E6] ${compact ? "text-[12px]" : "text-[13px]"}`}>
            {phase === "paused" ? "The video resumes when you come back to this tab." : message ?? "The camera could not be opened."}
          </p>
          {!compact && (phase === "offline" || phase === "not_allowed") && (
            <button type="button" onClick={retry} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#45DFB1] px-3.5 text-[14px] font-medium text-[#0B2A22] hover:bg-[#80ED99] lg:min-h-[36px]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
          )}
        </div>
      )}
      <span className="sr-only" role="status">{`${feed.label}: ${status.label}`}</span>
    </div>
  );
}

/** A camera with no stream: same frame, saying so. */
export function CctvNotLive({ feed }: { feed: CctvFeed }) {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg bg-[#EEF3F4] px-4 text-center text-[13px] leading-[1.45] text-[#4F6B73]">
      {feed.label}: no camera installed here yet.
    </div>
  );
}

/** The full camera view: picture, quality, sound, full screen and, for operators, the arrows. */
export function CctvViewer({ feed, footer }: { feed: CctvFeed; footer?: ReactNode }) {
  const { canOperate } = useErpAccess();
  const [quality, setQuality] = useState<CctvQuality>("sd");
  const [muted, setMuted] = useState(true);
  const [ptzError, setPtzError] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  if (!feed.live) return <CctvNotLive feed={feed} />;

  const move = (dir: PtzDir) => {
    void ticket()
      .then((t) => movePtz(t, dir))
      .then(() => setPtzError(false), () => setPtzError(true));
  };

  const fullscreen = () => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
    else (el.querySelector("video") as unknown as { webkitEnterFullscreen?: () => void } | null)?.webkitEnterFullscreen?.();
  };

  return (
    <div className="space-y-2.5">
      <CctvLive feed={feed} quality={quality} muted={muted} frame={frame} />
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex rounded-lg bg-[#EEF3F4] p-0.5 text-[13px] font-medium" role="group" aria-label="Picture quality">
          {(["sd", "hd"] as const).map((q) => (
            <button key={q} type="button" aria-pressed={quality === q} onClick={() => setQuality(q)} className={`min-h-[40px] rounded-md px-2.5 lg:min-h-[28px] ${quality === q ? "bg-white text-[#0F2F36] shadow-sm" : "text-[#4F6B73] hover:text-[#0F2F36]"}`}>
              {CCTV_QUALITY_LABEL[q]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"} className={iconButton}>
          {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={fullscreen} aria-label="Show the video full screen" className={iconButton}>
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        {canOperate && <PtzPad onMove={move} />}
      </div>
      {canOperate && <p className="text-[12px] leading-[1.45] text-[#4F6B73]">{ptzError ? "The camera did not take the command. Try again in a moment." : "Hold an arrow to turn the camera, let go to stop."}</p>}
      {footer}
    </div>
  );
}

/* ---------------------------------------------------------------------- PTZ */

function PtzPad({ onMove }: { onMove: (d: PtzDir) => void }) {
  return (
    <div className="ml-auto flex items-center gap-1" role="group" aria-label="Turn the camera">
      <PtzButton dir="left" label="Turn left" onMove={onMove}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></PtzButton>
      <PtzButton dir="up" label="Turn up" onMove={onMove}><ChevronUp className="h-4 w-4" aria-hidden="true" /></PtzButton>
      <PtzButton dir="down" label="Turn down" onMove={onMove}><ChevronDown className="h-4 w-4" aria-hidden="true" /></PtzButton>
      <PtzButton dir="right" label="Turn right" onMove={onMove}><ChevronRight className="h-4 w-4" aria-hidden="true" /></PtzButton>
    </div>
  );
}

function PtzButton({ dir, label, onMove, children }: { dir: Exclude<PtzDir, "stop">; label: string; onMove: (d: PtzDir) => void; children: ReactNode }) {
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
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={end}
      onBlur={end}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex w-11 touch-none select-none items-center justify-center rounded-lg border border-[#DCE7E8] bg-white text-[#0B6477] hover:bg-[#EEF3F4] active:bg-[#DDF7EC] h-11 lg:h-8 lg:w-8`}
    >
      {children}
    </button>
  );
}
