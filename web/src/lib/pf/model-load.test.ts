import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { cacheKey, gunzipIfNeeded, isGzip, modelBytes, slowConnection, weakDevice, type ModelDeps, type ModelProgress } from "./model-load";

const GLB = new TextEncoder().encode("glTF-model-bytes");

function memoryCache() {
  const store = new Map<string, Uint8Array>();
  return {
    store,
    match: async (key: RequestInfo | URL) => {
      const hit = store.get(String(key));
      return hit ? new Response(hit as BodyInit) : undefined;
    },
    put: async (key: RequestInfo | URL, res: Response) => void store.set(String(key), new Uint8Array(await res.arrayBuffer())),
    keys: async () => [...store.keys()].map((k) => new Request(k)),
    delete: async (key: RequestInfo | URL) => store.delete(typeof key === "string" ? key : (key as Request).url),
  } as unknown as Cache & { store: Map<string, Uint8Array> };
}

function deps(body: Uint8Array, over: Partial<ModelDeps> = {}) {
  let fetched = 0;
  const d: ModelDeps = {
    urls: async () => ({ modelUrl: "https://signed.test/plant_factory.glb?token=1", manifestUrl: "https://signed.test/manifest.json?token=1" }),
    version: async () => "etag-1",
    fetch: (async () => {
      fetched++;
      return new Response(body as BodyInit, { headers: { "content-length": String(body.length) } });
    }) as typeof fetch,
    cache: async () => null,
    ...over,
  };
  return { d, fetched: () => fetched };
}

describe("3D model download", () => {
  it("unpacks a gzipped model and leaves a plain one alone", async () => {
    const packed = new Uint8Array(gzipSync(GLB));
    expect(isGzip(packed)).toBe(true);
    expect(isGzip(GLB)).toBe(false);
    expect(await gunzipIfNeeded(packed)).toEqual(GLB);
    expect(await gunzipIfNeeded(GLB)).toBe(GLB);
  });

  it("keeps the model on the device and opens it from there on the next visit", async () => {
    const cache = memoryCache();
    const packed = new Uint8Array(gzipSync(GLB));
    const first = deps(packed, { cache: async () => cache });
    const a = await modelBytes("plant_factory.glb", first.d, () => {});
    expect(a.bytes).toEqual(GLB);
    expect(first.fetched()).toBe(1);
    expect([...cache.store.keys()]).toEqual([cacheKey("plant_factory.glb", "etag-1")]);

    const second = deps(packed, { cache: async () => cache });
    const b = await modelBytes("plant_factory.glb", second.d, () => {});
    expect(b.bytes).toEqual(GLB);
    expect(second.fetched()).toBe(0);
  });

  it("fetches a new upload again and drops the old copy", async () => {
    const cache = memoryCache();
    await modelBytes("plant_factory.glb", deps(GLB, { cache: async () => cache }).d, () => {});
    const next = deps(GLB, { cache: async () => cache, version: async () => "etag-2" });
    await modelBytes("plant_factory.glb", next.d, () => {});
    expect(next.fetched()).toBe(1);
    expect([...cache.store.keys()]).toEqual([cacheKey("plant_factory.glb", "etag-2")]);
  });

  it("never keeps a model without a version, and still works without a store", async () => {
    const cache = memoryCache();
    const local = deps(GLB, { cache: async () => cache, version: async () => null });
    expect((await modelBytes("plant_factory.glb", local.d, () => {})).bytes).toEqual(GLB);
    expect(cache.store.size).toBe(0);
    const blocked = deps(GLB, { cache: async () => { throw new Error("SecurityError"); } });
    expect((await modelBytes("plant_factory.glb", blocked.d, () => {})).bytes).toEqual(GLB);
  });

  it("reports the download, then the build", async () => {
    const seen: ModelProgress[] = [];
    await modelBytes("plant_factory.glb", deps(GLB).d, (p) => seen.push(p));
    expect(seen[0]).toEqual({ phase: "download", loaded: 0, total: GLB.length });
    expect(seen.at(-2)).toEqual({ phase: "download", loaded: GLB.length, total: GLB.length });
    expect(seen.at(-1)).toEqual({ phase: "prepare" });
  });

  it("fails on a refused download", async () => {
    const refused = deps(GLB, { fetch: (async () => new Response("no", { status: 403 })) as typeof fetch });
    await expect(modelBytes("plant_factory.glb", refused.d, () => {})).rejects.toThrow("403");
  });
});

describe("slow connections and weak devices", () => {
  it("skips the second model on Save-Data or a slow link", () => {
    expect(slowConnection({ saveData: true })).toBe(true);
    expect(slowConnection({ effectiveType: "3g" })).toBe(true);
    expect(slowConnection({ effectiveType: "4g" })).toBe(false);
    expect(slowConnection({})).toBe(false);
  });

  it("starts weak devices in the light mode", () => {
    expect(weakDevice({ deviceMemory: 2 })).toBe(true);
    expect(weakDevice({ cores: 4 })).toBe(true);
    expect(weakDevice({ deviceMemory: 8, cores: 8 })).toBe(false);
    expect(weakDevice({})).toBe(false);
  });
});
