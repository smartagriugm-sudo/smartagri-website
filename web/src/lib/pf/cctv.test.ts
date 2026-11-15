import { describe, expect, it } from "vitest";
import { cctvFeed, frameUrl, mseCodecs, streamUrl, ticketFresh, type CctvTicket } from "./cctv";

const t: CctvTicket = { base: "https://cctv.example.id", ticket: "1700000000.abc", expiresAt: 1_000_000 };

describe("the plant factory camera", () => {
  it("asks only for codecs the browser plays", () => {
    expect(mseCodecs((m) => m.includes("avc1.64002") || m.includes("flac"))).toBe("avc1.640029,avc1.64002A,flac");
    expect(mseCodecs(() => false)).toBe("");
  });

  it("uses a ticket until 30 seconds before it runs out", () => {
    expect(ticketFresh(t, 1_000_000 - 31_000)).toBe(true);
    expect(ticketFresh(t, 1_000_000 - 29_000)).toBe(false);
    expect(ticketFresh(null)).toBe(false);
  });

  it("knows which camera in the model streams", () => {
    expect(cctvFeed("CCTV-GROW")?.live).toBe(true);
    expect(cctvFeed("CCTV-CONTROL")?.live).toBe(false);
    expect(cctvFeed("LAMP-1")).toBeNull();
    expect(cctvFeed(null)).toBeNull();
  });

  it("builds the video and still addresses on the gateway", () => {
    expect(streamUrl(t, "sd")).toBe("wss://cctv.example.id/api/ws?src=plant_factory_sd&t=1700000000.abc");
    expect(streamUrl({ ...t, base: "http://localhost:1985" }, "hd")).toBe("ws://localhost:1985/api/ws?src=plant_factory&t=1700000000.abc");
    expect(frameUrl(t, "hd")).toBe("https://cctv.example.id/api/frame.jpeg?src=plant_factory&t=1700000000.abc");
  });
});
