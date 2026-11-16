import { describe, expect, it } from "vitest";
import { MAX_EDGE_READINGS, edgeFailureStatus, parseEdgeIngest } from "./ingest";

describe("an edge ingest request", () => {
  const reading = { device: "dev-1", metric: "temperature", value: 24, ts: "2026-11-16T04:00:00Z" };

  it("takes the token and the payload", () => {
    expect(parseEdgeIngest("Bearer edg_abc", { devices: [], readings: [reading] })).toEqual({
      token: "edg_abc",
      payload: { devices: [], actuators: [], actuators_complete: false, readings: [reading] },
    });
    expect(parseEdgeIngest("bearer edg_abc", { actuators: [], actuators_complete: true })).toMatchObject({
      payload: { actuators_complete: true, readings: [] },
    });
  });

  it("refuses without a token", () => {
    expect(parseEdgeIngest(undefined, {})).toMatchObject({ status: 401 });
    expect(parseEdgeIngest("edg_abc", {})).toMatchObject({ status: 401 });
  });

  it("refuses a body it cannot read or that is too long", () => {
    expect(parseEdgeIngest("Bearer x", null)).toMatchObject({ status: 400 });
    expect(parseEdgeIngest("Bearer x", [])).toMatchObject({ status: 400 });
    expect(parseEdgeIngest("Bearer x", { readings: "temperature" })).toMatchObject({ status: 400 });
    expect(parseEdgeIngest("Bearer x", { readings: new Array(MAX_EDGE_READINGS + 1).fill(reading) })).toMatchObject({
      status: 413,
    });
  });

  it("tells the edge PC what a failure means", () => {
    expect(edgeFailureStatus("28000", "x")).toBe(401);
    expect(edgeFailureStatus(undefined, "Site token not recognised")).toBe(401);
    expect(edgeFailureStatus("PGRST202", "x")).toBe(503);
    expect(edgeFailureStatus("P0001", "payload must be an object")).toBe(400);
  });
});
