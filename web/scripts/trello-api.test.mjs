import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCover, fetchAllComments, pickImageUrl, pool, toWebp, trelloAuth } from "./trello-api.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("trello api requests (stubbed fetch)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pages through comments with `before`, keeps auth in the header, retries 429", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}`, type: "commentCard" }));
    const page2 = [{ id: "b0", type: "commentCard" }];
    const calls = [];
    let first = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), auth: init.headers.Authorization });
        if (first) {
          first = false;
          return new Response("slow down", { status: 429 });
        }
        return json(String(url).includes("before=") ? page2 : page1);
      }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 500 });
    const all = await fetchAllComments("BOARD", trelloAuth("k", "t"));
    vi.useRealTimers();
    expect(all).toHaveLength(1001);
    expect(calls).toHaveLength(3); // 429, page 1, page 2
    expect(calls[2].url).toContain("before=a999");
    expect(calls.every((c) => c.auth.includes('oauth_token="t"') && !c.url.includes("token"))).toBe(true);
  });

  it("explains a rejected key or token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unauthorized", { status: 401 })));
    await expect(fetchAllComments("BOARD", trelloAuth("k", "bad"))).rejects.toThrow(/TRELLO_KEY and TRELLO_TOKEN/);
  });

  it("downloads a cover preview and returns WebP, refusing non-images", async () => {
    const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#14919B" } }).png().toBuffer();
    const fetchMock = vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);
    const att = { url: "https://trello.com/orig.png", previews: [{ url: "https://trello.com/p1200.png", width: 1200 }] };
    const webp = await downloadCover(att, trelloAuth("k", "t"));
    expect(fetchMock.mock.calls[0][0]).toBe("https://trello.com/p1200.png");
    expect((await sharp(webp).metadata()).format).toBe("webp");

    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } })));
    await expect(downloadCover(att, trelloAuth("k", "t"))).rejects.toThrow(/not an image/);
  });
});

describe("trello api helpers", () => {
  it("sends the key and token as an OAuth header", () => {
    expect(trelloAuth("k", "t")).toEqual({ Authorization: 'OAuth oauth_consumer_key="k", oauth_token="t"' });
  });

  it("picks the smallest preview that is wide enough, else the original", () => {
    const att = {
      url: "orig",
      previews: [
        { url: "p2048", width: 2048 },
        { url: "p150", width: 150 },
        { url: "p1200", width: 1200 },
      ],
    };
    expect(pickImageUrl(att)).toBe("p1200");
    expect(pickImageUrl({ url: "orig", previews: [{ url: "p150", width: 150 }] })).toBe("orig");
    expect(pickImageUrl({ url: "orig" })).toBe("orig");
  });

  it("shrinks images to WebP at most 1200 px wide", async () => {
    const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#0B6477" } }).png().toBuffer();
    const out = await toWebp(png);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1200);
    expect(out.length).toBeLessThan(png.length);

    const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#45DFB1" } }).png().toBuffer();
    expect((await sharp(await toWebp(small)).metadata()).width).toBe(300);
  });

  it("runs every item with limited concurrency", async () => {
    let active = 0;
    let peak = 0;
    const seen = [];
    await pool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      active -= 1;
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });
});
