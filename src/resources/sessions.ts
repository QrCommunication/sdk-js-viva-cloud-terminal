import type { HttpClient, JsonObject } from "../http.js";
import type { ListSessionsParams, PollOptions, Session } from "../types/session.js";
import { EcrEventId, ecrEventIdFrom, isTerminalEvent } from "../enums.js";

const DEFAULT_TIMEOUT_SECONDS = 120;
const DEFAULT_INTERVAL_MS = 3000;

/**
 * Sessions resource — retrieve, list and abort Cloud Terminal sessions.
 *
 * A session represents a single transaction lifecycle on a POS device. After
 * initiating a transaction (see {@link TransactionsResource}), poll the session
 * by id to observe its outcome (`eventId`, `success`, `transactionId`, ...).
 *
 * Endpoints (Bearer auth):
 * - `GET    /ecr/v1/sessions/{sessionId}`
 * - `GET    /ecr/v1/sessions?date=YYYY-MM-DD`
 * - `DELETE /ecr/v1/sessions/{sessionId}?cashRegisterId=...`
 */
export class SessionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieve a session by its id.
   *
   * `GET /ecr/v1/sessions/{sessionId}`.
   */
  async get(sessionId: string): Promise<Session> {
    return this.http.get(`/ecr/v1/sessions/${encodeURIComponent(sessionId)}`) as Promise<Session>;
  }

  /**
   * List all sessions carried out on a date.
   *
   * `GET /ecr/v1/sessions?date=YYYY-MM-DD`.
   */
  async listByDate(params: ListSessionsParams): Promise<JsonObject> {
    const query: Record<string, string | undefined> = { date: params.date };
    if (params.aadeAutonomouslyOnly !== undefined) {
      query["AadeAutonomouslyOnly"] = params.aadeAutonomouslyOnly ? "true" : "false";
    }
    return this.http.get("/ecr/v1/sessions", query);
  }

  /**
   * Abort an active session.
   *
   * `DELETE /ecr/v1/sessions/{sessionId}?cashRegisterId=...`.
   * Only the cash register that created the transaction can abort it.
   */
  async abort(sessionId: string, cashRegisterId: string): Promise<JsonObject> {
    return this.http.delete(`/ecr/v1/sessions/${encodeURIComponent(sessionId)}`, {
      cashRegisterId,
    });
  }

  /**
   * Poll a session until it reaches a terminal state or the timeout elapses.
   *
   * Keeps polling while `eventId` is {@link EcrEventId.IN_PROGRESS} (1100),
   * sleeping `intervalMs` between attempts. Returns the final session state.
   * Polling also stops on an unknown event id (fail-safe).
   */
  async pollUntilComplete(sessionId: string, options: PollOptions = {}): Promise<Session> {
    const timeoutSeconds = options.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const deadline = Date.now() + timeoutSeconds * 1000;

    let session: Session = {};

    while (Date.now() < deadline) {
      session = await this.get(sessionId);

      const event = ecrEventIdFrom(session.eventId);

      // Unknown event id or a terminal event → stop polling and return.
      if (event === null || isTerminalEvent(event)) {
        return session;
      }

      await sleep(intervalMs);
    }

    if (Object.keys(session).length === 0) {
      return {
        success: false,
        eventId: EcrEventId.TERMINAL_TIMEOUT,
        message: "SDK poll timeout",
      };
    }

    return session;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
