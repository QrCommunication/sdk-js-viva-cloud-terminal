import { describe, expect, it } from "vitest";
import { VivaCloudTerminalClient } from "../src/client.js";
import { Environment } from "../src/enums.js";
import { mockFetch, tokenResponse } from "./support/mock-fetch.js";

describe("VivaCloudTerminalClient", () => {
  it("wires up the three resources", () => {
    const client = new VivaCloudTerminalClient({ clientId: "id", clientSecret: "secret" });
    expect(client.devices).toBeDefined();
    expect(client.transactions).toBeDefined();
    expect(client.sessions).toBeDefined();
  });

  it("exposes the resolved config", () => {
    const client = new VivaCloudTerminalClient({
      clientId: "id",
      clientSecret: "secret",
      environment: Environment.PRODUCTION,
    });
    expect(client.getConfig().isProduction()).toBe(true);
  });

  it("invalidateToken() forces a fresh handshake on the next call", async () => {
    const mocked = mockFetch([
      tokenResponse(),
      { status: 200, body: [] },
      tokenResponse(),
      { status: 200, body: [] },
    ]);
    const client = new VivaCloudTerminalClient({
      clientId: "id",
      clientSecret: "secret",
      fetch: mocked.fetch,
    });

    await client.devices.search();
    client.invalidateToken();
    await client.devices.search();

    expect(mocked.history.filter((h) => h.url.includes("/connect/token"))).toHaveLength(2);
  });

  it("pollUntilComplete() delegates to the sessions resource", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: { eventId: 0 } }]);
    const client = new VivaCloudTerminalClient({
      clientId: "id",
      clientSecret: "secret",
      fetch: mocked.fetch,
    });

    const final = await client.pollUntilComplete("sess-1", { intervalMs: 1 });
    expect(final).toEqual({ eventId: 0 });
  });
});
