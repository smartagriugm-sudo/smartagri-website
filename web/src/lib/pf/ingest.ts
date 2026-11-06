// What POST /api/pf/ingest accepts, before anything reaches the database, which
// has the last word on each reading. Contract: docs/erp-plant-factory/API-SENSOR.md.

export const MAX_READINGS_PER_POST = 1000;

export type IngestRequest = { token: string; readings: unknown[] };

/** The bearer token and the list of readings out of a request, or why not. */
export function parseIngestRequest(authorization: string | undefined, body: unknown): { error: string; status: number } | IngestRequest {
  const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
  if (!token) return { error: "Token perangkat tidak ada", status: 401 };
  const readings = (body as { readings?: unknown } | null)?.readings;
  if (!Array.isArray(readings)) return { error: "Isi kiriman harus berupa { readings: [...] }", status: 400 };
  if (readings.length === 0) return { token, readings: [] };
  if (readings.length > MAX_READINGS_PER_POST) return { error: `Paling banyak ${MAX_READINGS_PER_POST} bacaan per kiriman`, status: 413 };
  return { token, readings };
}

/** The status a device should act on: 401 needs a new token, 503 means send it again later. */
export function ingestFailureStatus(code: string | undefined, message: string) {
  if (code === "28000" || /Token perangkat/i.test(message)) return 401;
  if (code === "PGRST202" || code === "PGRST205") return 503;
  return 400;
}
