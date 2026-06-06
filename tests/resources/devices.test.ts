import { describe, expect, it } from "vitest";
import { VivaCloudTerminalClient } from "../../src/client.js";
import { mockFetch, tokenResponse } from "../support/mock-fetch.js";

function makeClient(fetchImpl: typeof fetch): VivaCloudTerminalClient {
  return new VivaCloudTerminalClient({
    clientId: "cid",
    clientSecret: "csecret",
    fetch: fetchImpl,
  });
}

describe("DevicesResource", () => {
  it("search() posts to devices:search with filters", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: [{ terminalId: "16000010", statusId: 1 }] },
    ]);
    const client = makeClient(mocked.fetch);

    const result = await client.devices.search({ statusId: 1, sourceCode: "POS-1" });

    expect(result).toEqual([{ terminalId: "16000010", statusId: 1 }]);

    const call = mocked.last();
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://demo-api.vivapayments.com/ecr/v1/devices:search");
    expect(call.body).toEqual({ statusId: 1, sourceCode: "POS-1" });
    expect(call.headers["Authorization"]).toBe("Bearer test-access-token");
  });

  it("search() omits undefined filters", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: [] }]);
    const client = makeClient(mocked.fetch);

    await client.devices.search();

    expect(mocked.last().body).toEqual({});
  });
});
