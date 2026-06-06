import { vi } from "vitest";

export interface MockedResponse {
  status: number;
  /** When `undefined`, an empty body is returned (mirrors Viva success bodies). */
  body?: unknown;
  headers?: Record<string, string>;
  /** Return the body raw (string) instead of JSON-stringifying it. */
  raw?: boolean;
}

export interface MockFetchHistory {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

export interface MockedFetch {
  fetch: typeof fetch;
  history: MockFetchHistory[];
  last(): MockFetchHistory;
}

/**
 * A queued OAuth2 token response. Append this BEFORE the response of any
 * authenticated endpoint, because {@link HttpClient} performs the
 * client_credentials handshake on the first authenticated call.
 */
export function tokenResponse(expiresIn = 3600): MockedResponse {
  return { status: 200, body: { access_token: "test-access-token", expires_in: expiresIn } };
}

export function mockFetch(responses: MockedResponse[]): MockedFetch {
  const history: MockFetchHistory[] = [];
  let index = 0;

  const impl: typeof fetch = vi.fn(async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args;
    const url =
      input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        for (const [key, value] of init.headers) {
          if (key !== undefined) headers[key] = value ?? "";
        }
      } else {
        Object.assign(headers, init.headers);
      }
    }
    let body: unknown = null;
    if (typeof init?.body === "string" && init.body !== "") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    history.push({ url, method, body, headers });

    if (index >= responses.length) {
      throw new Error(`mockFetch: no more responses queued (call #${index + 1})`);
    }
    const response = responses[index++]!;
    let payload: string;
    if (response.body === undefined) {
      payload = "";
    } else if (response.raw) {
      payload = String(response.body);
    } else {
      payload = JSON.stringify(response.body);
    }
    return new Response(payload, {
      status: response.status,
      headers: response.headers ?? { "Content-Type": "application/json" },
    });
  });

  return {
    fetch: impl,
    history,
    last(): MockFetchHistory {
      if (history.length === 0) {
        throw new Error("mockFetch: no requests recorded yet.");
      }
      return history[history.length - 1]!;
    },
  };
}
