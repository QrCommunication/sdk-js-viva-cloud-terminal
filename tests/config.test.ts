import { describe, expect, it } from "vitest";
import { CloudTerminalConfig } from "../src/config.js";
import { Environment } from "../src/enums.js";

describe("CloudTerminalConfig", () => {
  it("defaults to the demo environment and its hosts", () => {
    const config = new CloudTerminalConfig({ clientId: "id", clientSecret: "secret" });

    expect(config.environment).toBe(Environment.DEMO);
    expect(config.accountsUrl()).toBe("https://demo-accounts.vivapayments.com");
    expect(config.apiUrl()).toBe("https://demo-api.vivapayments.com");
    expect(config.isSandbox()).toBe(true);
    expect(config.isProduction()).toBe(false);
    expect(config.timeoutMs).toBe(30_000);
  });

  it("resolves production hosts", () => {
    const config = new CloudTerminalConfig({
      clientId: "id",
      clientSecret: "secret",
      environment: Environment.PRODUCTION,
    });

    expect(config.accountsUrl()).toBe("https://accounts.vivapayments.com");
    expect(config.apiUrl()).toBe("https://api.vivapayments.com");
    expect(config.isProduction()).toBe(true);
    expect(config.isSandbox()).toBe(false);
  });

  it("throws when clientId is missing", () => {
    expect(() => new CloudTerminalConfig({ clientId: "", clientSecret: "secret" })).toThrow(
      /clientId is required/,
    );
  });

  it("throws when clientSecret is missing", () => {
    expect(() => new CloudTerminalConfig({ clientId: "id", clientSecret: "" })).toThrow(
      /clientSecret is required/,
    );
  });

  it("accepts a custom timeout and fetch", () => {
    const customFetch = (() => Promise.resolve(new Response())) as unknown as typeof fetch;
    const config = new CloudTerminalConfig({
      clientId: "id",
      clientSecret: "secret",
      timeoutMs: 5_000,
      fetch: customFetch,
    });

    expect(config.timeoutMs).toBe(5_000);
    expect(config.fetch).toBe(customFetch);
  });
});
