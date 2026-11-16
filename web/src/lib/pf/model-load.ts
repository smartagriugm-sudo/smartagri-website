import { MODEL_BUCKET, MODEL_FILES, modelUrls } from "./model-assets";
import { isAuthConfigured, supabase } from "../auth/supabase";

// Fetches a facility's 3D model once and keeps it on the device, so the next visit
// opens the model without downloading it again. The bucket hands out a new signed
// link every visit, which the browser's own cache cannot match, so the model is kept
// in Cache Storage under its file name and the bucket's ETag instead: a new upload
// gets a new ETag and is fetched again, and the old copy is dropped. The model may be
// stored gzipped (see scripts/pack-model.mjs); it is unpacked here, in the browser.
// The user agreed to Cache Storage for this one purpose; app state still uses none.

export type Facility = keyof typeof MODEL_FILES;

export type ModelProgress =
  | { phase: "download"; loaded: number; total: number | null }
  | { phase: "prepare" };

export type LoadedModel = { modelUrl: string; manifestUrl: string; release: () => void };

export const CACHE_NAME = "smartagri-pf-model";

type CacheLike = Pick<Cache, "match" | "put" | "keys" | "delete">;

export type ModelDeps = {
  urls: () => Promise<{ modelUrl: string; manifestUrl: string }>;
  /** The stored file's version (its ETag), or null when there is none to trust. */
  version: () => Promise<string | null>;
  fetch: typeof fetch;
  cache: () => Promise<CacheLike | null>;
};

/** The made-up address a model is kept under; it is never fetched. */
export function cacheKey(file: string, version: string) {
  return `https://pf-model.cache/${file}?v=${encodeURIComponent(version)}`;
}

export function isGzip(bytes: Uint8Array) {
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export async function gunzipIfNeeded(bytes: Uint8Array): Promise<Uint8Array> {
  if (!isGzip(bytes)) return bytes;
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function download(f: typeof fetch, url: string, onProgress: (p: ModelProgress) => void): Promise<Uint8Array> {
  const res = await f(url);
  if (!res.ok) throw new Error(`Model download failed: ${res.status}`);
  const header = Number(res.headers.get("content-length"));
  const total = Number.isFinite(header) && header > 0 ? header : null;
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  onProgress({ phase: "download", loaded, total });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    onProgress({ phase: "download", loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  return bytes;
}

/** The model's bytes, unpacked: from the device when this version is kept, else downloaded and kept. */
export async function modelBytes(file: string, deps: ModelDeps, onProgress: (p: ModelProgress) => void) {
  const [{ modelUrl, manifestUrl }, version, cache] = await Promise.all([
    deps.urls(),
    deps.version().catch(() => null),
    deps.cache().catch(() => null),
  ]);
  const key = version && cache ? cacheKey(file, version) : null;
  let bytes: Uint8Array | null = null;
  if (key && cache) {
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) bytes = new Uint8Array(await hit.arrayBuffer());
  }
  if (!bytes) {
    bytes = await download(deps.fetch, modelUrl, onProgress);
    if (key && cache) {
      const prefix = `https://pf-model.cache/${file}?`;
      try {
        for (const old of await cache.keys()) if (old.url.startsWith(prefix) && old.url !== key) await cache.delete(old);
        await cache.put(key, new Response(bytes as BodyInit, { headers: { "content-type": "application/octet-stream" } }));
      } catch {
        // A full or blocked store only means the next visit downloads again.
      }
    }
  }
  onProgress({ phase: "prepare" });
  return { bytes: await gunzipIfNeeded(bytes), manifestUrl };
}

// ------------------------------------------------------------------ in the browser

const listeners = new Set<() => void>();
const progress = new Map<Facility, ModelProgress>();
const loads = new Map<Facility, Promise<{ blob: Blob; manifestUrl: string }>>();

export function modelProgress(facility: Facility) {
  return progress.get(facility) ?? null;
}

export function onModelProgress(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function report(facility: Facility, p: ModelProgress | null) {
  if (p) progress.set(facility, p);
  else progress.delete(facility);
  for (const fn of listeners) fn();
}

function browserDeps(facility: Facility): ModelDeps {
  const { model } = MODEL_FILES[facility];
  const local = import.meta.env.DEV || !isAuthConfigured;
  return {
    urls: () => modelUrls(facility),
    // In development the local copy changes freely, so it is never kept.
    version: async () => {
      if (local) return null;
      const { data, error } = await supabase!.storage.from(MODEL_BUCKET).list("", { search: model });
      if (error) return null;
      const meta = data?.find((f) => f.name === model)?.metadata as { eTag?: string } | undefined;
      return meta?.eTag ?? null;
    },
    fetch: (...args) => fetch(...args),
    cache: async () => (typeof caches === "undefined" ? null : caches.open(CACHE_NAME)),
  };
}

/**
 * Opens a facility's model for the engine: a local address for its unpacked bytes and
 * the manifest's link. The bytes are fetched once per page visit and shared by every
 * screen that shows this facility. Call release() once the engine has loaded.
 */
export async function loadModel(facility: Facility): Promise<LoadedModel> {
  let pending = loads.get(facility);
  if (!pending) {
    pending = modelBytes(MODEL_FILES[facility].model, browserDeps(facility), (p) => report(facility, p))
      .then(({ bytes, manifestUrl }) => ({ blob: new Blob([bytes as BlobPart], { type: "model/gltf-binary" }), manifestUrl }));
    loads.set(facility, pending);
    pending.catch(() => {
      loads.delete(facility);
      report(facility, null);
    });
  }
  const { blob, manifestUrl } = await pending;
  const modelUrl = URL.createObjectURL(blob);
  return { modelUrl, manifestUrl, release: () => URL.revokeObjectURL(modelUrl) };
}

/** Called once the engine has built the model, so the next screen starts without a bar. */
export function modelShown(facility: Facility) {
  report(facility, null);
}

// ------------------------------------------------------------------ weak devices

type DeviceHints = { saveData?: boolean; effectiveType?: string; deviceMemory?: number; cores?: number };

export function deviceHints(): DeviceHints {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  return { saveData: nav.connection?.saveData, effectiveType: nav.connection?.effectiveType, deviceMemory: nav.deviceMemory, cores: nav.hardwareConcurrency };
}

/** A slow or metered connection: load only the model that is asked for. */
export function slowConnection(h: DeviceHints = deviceHints()) {
  return !!h.saveData || h.effectiveType === "slow-2g" || h.effectiveType === "2g" || h.effectiveType === "3g";
}

/** A device that should start the engine in its light mode. */
export function weakDevice(h: DeviceHints = deviceHints()) {
  return !!h.saveData || (h.deviceMemory !== undefined && h.deviceMemory <= 4) || (h.cores !== undefined && h.cores <= 4);
}
