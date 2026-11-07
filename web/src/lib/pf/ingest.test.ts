import { describe, expect, it } from "vitest";
import { MAX_READINGS_PER_POST, ingestFailureStatus, parseIngestRequest } from "./ingest";

describe("an ingest request", () => {
  const reading = { metric: "suhu", value: 24, ts: "2026-11-06T04:00:00Z" };

  it("takes the token and the readings", () => {
    expect(parseIngestRequest("Bearer pfd_abc", { readings: [reading] })).toEqual({ token: "pfd_abc", readings: [reading] });
    expect(parseIngestRequest("bearer pfd_abc", { readings: [] })).toEqual({ token: "pfd_abc", readings: [] });
  });

  it("refuses without a token", () => {
    expect(parseIngestRequest(undefined, { readings: [] })).toMatchObject({ status: 401 });
    expect(parseIngestRequest("pfd_abc", { readings: [] })).toMatchObject({ status: 401 });
    expect(parseIngestRequest("Bearer ", { readings: [] })).toMatchObject({ status: 401 });
  });

  it("refuses a body it cannot read or that is too long", () => {
    expect(parseIngestRequest("Bearer x", null)).toMatchObject({ status: 400 });
    expect(parseIngestRequest("Bearer x", { readings: "suhu" })).toMatchObject({ status: 400 });
    expect(parseIngestRequest("Bearer x", { readings: new Array(MAX_READINGS_PER_POST + 1).fill(reading) })).toMatchObject({ status: 413 });
  });

  it("tells the device what a failure means", () => {
    expect(ingestFailureStatus("28000", "x")).toBe(401);
    expect(ingestFailureStatus(undefined, "Device token not recognised")).toBe(401);
    expect(ingestFailureStatus("PGRST202", "x")).toBe(503);
    expect(ingestFailureStatus("P0001", "readings must be a list")).toBe(400);
  });
});
