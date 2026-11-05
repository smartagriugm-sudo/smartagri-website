import { describe, expect, it } from "vitest";
import { MODEL_BUCKET, modelUrls } from "./model-assets";

describe("3D model location", () => {
  it("uses the local copy in development", async () => {
    await expect(modelUrls("chamber", { useLocal: true })).resolves.toEqual({
      modelUrl: "/brand/plant-factory/seed_chamber.glb",
      manifestUrl: "/brand/plant-factory/seed_chamber_manifest.json",
    });
  });

  it("asks the private bucket for short-lived links on the deployed site", async () => {
    const asked: string[] = [];
    const urls = await modelUrls("plantFactory", {
      useLocal: false,
      sign: async (bucket, path, seconds) => {
        expect(bucket).toBe(MODEL_BUCKET);
        expect(seconds).toBeLessThanOrEqual(3600);
        asked.push(path);
        return `https://signed.test/${path}?token=x`;
      },
    });
    expect(asked.sort()).toEqual(["manifest.json", "plant_factory.glb"]);
    expect(urls.modelUrl).toBe("https://signed.test/plant_factory.glb?token=x");
    expect(urls.manifestUrl).toBe("https://signed.test/manifest.json?token=x");
  });

  it("fails rather than falling back to a public path when a link is refused", async () => {
    const refused = modelUrls("chamber", {
      useLocal: false,
      sign: async () => {
        throw new Error("Not authorized");
      },
    });
    await expect(refused).rejects.toThrow("Not authorized");
  });
});
