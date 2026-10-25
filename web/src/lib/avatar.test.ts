import { describe, expect, it } from "vitest";
import { DEFAULT_CROP, MAX_AVATAR_ZOOM, clampCrop, cropFromUrl } from "./avatar";

describe("cropFromUrl", () => {
  it("reads the crop from the avatar URL", () => {
    expect(cropFromUrl("https://x.supabase.co/a/avatar.webp?t=1&z=1.500&x=0.1000&y=-0.0500")).toEqual({ zoom: 1.5, x: 0.1, y: -0.05 });
  });

  it("falls back for old or missing URLs", () => {
    expect(cropFromUrl(null)).toEqual(DEFAULT_CROP);
    expect(cropFromUrl("https://x.supabase.co/a/avatar.png?t=1")).toEqual(DEFAULT_CROP);
    expect(cropFromUrl("not a url")).toEqual(DEFAULT_CROP);
  });
});

describe("clampCrop", () => {
  it("keeps a landscape image covering the circle", () => {
    // 200x100 at zoom 1: twice as wide as the circle, so x may move by 0.5.
    expect(clampCrop({ zoom: 1, x: 0.9, y: 0.3 }, 200, 100)).toEqual({ zoom: 1, x: 0.5, y: 0 });
  });

  it("allows more movement when zoomed and limits the zoom", () => {
    expect(clampCrop({ zoom: 2, x: -0.9, y: 0.9 }, 100, 100)).toEqual({ zoom: 2, x: -0.5, y: 0.5 });
    expect(clampCrop({ zoom: 99, x: 0, y: 0 }, 100, 100).zoom).toBe(MAX_AVATAR_ZOOM);
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, 100, 100).zoom).toBe(1);
  });
});
