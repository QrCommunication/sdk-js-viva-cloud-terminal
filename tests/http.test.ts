import { describe, expect, it } from "vitest";
import { CloudTerminalConfig } from "../src/config.js";
import { HttpClient } from "../src/http.js";
import { ApiError, AuthenticationError } from "../src/errors.js";
import { mockFetch, tokenResponse } from "./support/mock-fetch.js";

function makeClient(fetchImpl: typeof fetch): HttpClient {
  return new HttpClient(
    new CloudTerminalConfig({ clientId: "cid", clientSecret: "csecret", fetch: fetchImpl }),
  );
}

describe("HttpClient", () => {
  it("performs the OAuth handshake then sends a Bearer GET", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: { ok: true } }]);
    const http = makeClient(mocked.fetch);

    const result = await http.get("/ecr/v1/sessions/abc");

    expect(result).toEqual({ ok: true });

    const tokenCall = mocked.history[0]!;
    expect(tokenCall.url).toBe("https://demo-accounts.vivapayments.com/connect/token");
    expect(tokenCall.method).toBe("POST");
    expect(tokenCall.headers["Authorization"]).toBe(`Basic ${btoa("cid:csecret")}`);
    expect(tokenCall.body).toBe("grant_type=client_credentials");

    const apiCall = mocked.history[1]!;
    expect(apiCall.url).toBe("https://demo-api.vivapayments.com/ecr/v1/sessions/abc");
    expect(apiCall.headers["Authorization"]).toBe("Bearer test-access-token");
  });

  it("caches the token across requests", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: {} },
      { status: 200, body: {} },
    ]);
    const http = makeClient(mocked.fetch);

    await http.get("/ecr/v1/sessions/a");
    await http.get("/ecr/v1/sessions/b");

    // Only one token call (index 0); the next two are API calls.
    expect(mocked.history).toHaveLength(3);
    expect(mocked.history[0]!.url).toContain("/connect/token");
    expect(mocked.history[1]!.url).toContain("/ecr/v1/sessions/a");
    expect(mocked.history[2]!.url).toContain("/ecr/v1/sessions/b");
  });

  it("re-authenticates after invalidateToken()", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: {} },
      tokenResponse(),
      { status: 200, body: {} },
    ]);
    const http = makeClient(mocked.fetch);

    await http.get("/ecr/v1/sessions/a");
    http.invalidateToken();
    await http.get("/ecr/v1/sessions/b");

    expect(mocked.history.filter((h) => h.url.includes("/connect/token"))).toHaveLength(2);
  });

  it("returns {} on an empty success body", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const http = makeClient(mocked.fetch);

    expect(await http.post("/ecr/v1/transactions:sale", { a: 1 })).toEqual({});
  });

  it("encodes the query string for GET", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: [] }]);
    const http = makeClient(mocked.fetch);

    await http.get("/ecr/v1/sessions", { date: "2026-06-06", skip: undefined });

    expect(mocked.last().url).toBe(
      "https://demo-api.vivapayments.com/ecr/v1/sessions?date=2026-06-06",
    );
  });

  it("throws ApiError on a 4xx with the Viva error text", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 400, body: { ErrorText: "Bad params", ErrorCode: 6000 } },
    ]);
    const http = makeClient(mocked.fetch);

    const error = await http.post("/ecr/v1/transactions:sale", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.httpStatus).toBe(400);
    expect(apiError.getErrorText()).toBe("Bad params");
    expect(apiError.getErrorCode()).toBe(6000);
  });

  it("throws AuthenticationError on a failed token handshake", async () => {
    const mocked = mockFetch([{ status: 401, body: { error: "invalid_client" } }]);
    const http = makeClient(mocked.fetch);

    await expect(http.get("/ecr/v1/sessions/a")).rejects.toBeInstanceOf(AuthenticationError);
  });
});
