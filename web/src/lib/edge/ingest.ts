// What POST /api/edge/ingest accepts from an on-site edge PC, before anything
// reaches the database, which has the last word on each reading.
// Contract: docs/indoor-farming/API-EDGE-SYNC.md (in the repo root docs folder).

export const MAX_EDGE_READINGS = 2000;
export const MAX_EDGE_UNITS = 200;

export type EdgePayload = {
  devices: unknown[];
  actuators: unknown[];
  actuators_complete: boolean;
  readings: unknown[];
};

export type EdgeIngestRequest = { token: string; payload: EdgePayload };

const list = (v: unknown): unknown[] | null => (v === undefined ? [] : Array.isArray(v) ? v : null);

/** The site token and the payload out of a request, or why not. */
export function parseEdgeIngest(
  authorization: string | undefined,
  body: unknown,
): { error: string; status: number } | EdgeIngestRequest {
  const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
  if (!token) return { error: "Site token is missing", status: 401 };
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "The payload must be { devices, actuators, readings }", status: 400 };
  }
  const b = body as Record<string, unknown>;
  const devices = list(b.devices);
  const actuators = list(b.actuators);
  const readings = list(b.readings);
  if (!devices || !actuators || !readings) {
    return { error: "devices, actuators and readings must be lists", status: 400 };
  }
  if (readings.length > MAX_EDGE_READINGS) {
    return { error: `At most ${MAX_EDGE_READINGS} readings per send`, status: 413 };
  }
  if (devices.length > MAX_EDGE_UNITS || actuators.length > MAX_EDGE_UNITS) {
    return { error: `At most ${MAX_EDGE_UNITS} devices and ${MAX_EDGE_UNITS} actuators per send`, status: 413 };
  }
  return {
    token,
    payload: { devices, actuators, actuators_complete: b.actuators_complete === true, readings },
  };
}

/** The status the edge PC should act on: 401 needs a new token, 503 means send it again later. */
export function edgeFailureStatus(code: string | undefined, message: string) {
  if (code === "28000" || /Site token/i.test(message)) return 401;
  if (code === "PGRST202" || code === "PGRST205" || code === "42P01") return 503;
  return 400;
}
