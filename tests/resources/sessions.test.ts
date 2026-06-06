import { describe, expect, it } from "vitest";
import { VivaCloudTerminalClient } from "../../src/client.js";
import { EcrEventId } from "../../src/enums.js";
import { mockFetch, tokenResponse } from "../support/mock-fetch.js";

function makeClient(fetchImpl: typeof fetch): VivaCloudTerminalClient {
  return new VivaCloudTerminalClient({
    clientId: "cid",
    clientSecret: "csecret",
    fetch: fetchImpl,
  });
}

describe("SessionsResource", () => {
  it("get() fetches a single session (id encoded)", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: { eventId: 0, success: true } },
    ]);
    const client = makeClient(mocked.fetch);

    const session = await client.sessions.get("abc/123");

    expect(session).toEqual({ eventId: 0, success: true });
    expect(mocked.last().method).toBe("GET");
    expect(mocked.last().url).toBe("https://demo-api.vivapayments.com/ecr/v1/sessions/abc%2F123");
  });

  it("listByDate() builds the date + AadeAutonomouslyOnly query", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: [] }]);
    const client = makeClient(mocked.fetch);

    await client.sessions.listByDate({ date: "2026-06-06", aadeAutonomouslyOnly: true });

    expect(mocked.last().url).toBe(
      "https://demo-api.vivapayments.com/ecr/v1/sessions?date=2026-06-06&AadeAutonomouslyOnly=true",
    );
  });

  it("abort() DELETEs the session with cashRegisterId", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: {} }]);
    const client = makeClient(mocked.fetch);

    await client.sessions.abort("sess-1", "CR-01");

    const call = mocked.last();
    expect(call.method).toBe("DELETE");
    expect(call.url).toBe(
      "https://demo-api.vivapayments.com/ecr/v1/sessions/sess-1?cashRegisterId=CR-01",
    );
  });

  it("pollUntilComplete() polls while IN_PROGRESS then returns the terminal state", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: { eventId: EcrEventId.IN_PROGRESS } },
      { status: 200, body: { eventId: EcrEventId.SUCCESS, success: true } },
    ]);
    const client = makeClient(mocked.fetch);

    const final = await client.pollUntilComplete("sess-1", { intervalMs: 1 });

    expect(final).toEqual({ eventId: EcrEventId.SUCCESS, success: true });
    // 1 token + 2 polls.
    expect(mocked.history).toHaveLength(3);
  });

  it("pollUntilComplete() stops on an unknown event id (fail-safe)", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: { eventId: 4242 } }]);
    const client = makeClient(mocked.fetch);

    const final = await client.pollUntilComplete("sess-1", { intervalMs: 1 });

    expect(final).toEqual({ eventId: 4242 });
  });

  it("pollUntilComplete() returns a timeout state when nothing resolves", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: { eventId: EcrEventId.IN_PROGRESS } },
    ]);
    const client = makeClient(mocked.fetch);

    const final = await client.pollUntilComplete("sess-1", { timeoutSeconds: 0, intervalMs: 1 });

    // timeoutSeconds=0 → deadline already passed → no poll, empty session → SDK timeout state.
    expect(final.success).toBe(false);
    expect(final.eventId).toBe(EcrEventId.TERMINAL_TIMEOUT);
  });
});
