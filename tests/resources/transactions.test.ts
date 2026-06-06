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

const UUID = /^[0-9a-f-]{36}$/i;

describe("TransactionsResource", () => {
  it("sale() posts a camelCase payload and returns the sessionId", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.sale({
      terminalId: 16000010,
      amount: 1170,
      cashRegisterId: "CR-01",
    });

    expect(result.sessionId).toMatch(UUID);
    expect(result.response).toEqual({});

    const call = mocked.last();
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://demo-api.vivapayments.com/ecr/v1/transactions:sale");
    const body = call.body as Record<string, unknown>;
    expect(body.terminalId).toBe("16000010"); // cast to string
    expect(body.amount).toBe(1170);
    expect(body.currencyCode).toBe("978");
    expect(body.cashRegisterId).toBe("CR-01");
    expect(body.tipAmount).toBe(0);
    expect(body.merchantReference).toBe(`SDK-${result.sessionId}`);
    expect(body.sessionId).toBe(result.sessionId);
  });

  it("sale() honors a provided sessionId, preauth and extra fields", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.sale({
      terminalId: "16000010",
      amount: 5000,
      cashRegisterId: "CR-01",
      sessionId: "fixed-session",
      preauth: true,
      extra: { fiscalisationData: { foo: "bar" } },
    });

    expect(result.sessionId).toBe("fixed-session");
    const body = mocked.last().body as Record<string, unknown>;
    expect(body.sessionId).toBe("fixed-session");
    expect(body.preauth).toBe(true);
    expect(body.fiscalisationData).toEqual({ foo: "bar" });
  });

  it("capturePreauth() targets preauth-completion with parentSessionId", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.capturePreauth({
      parentSessionId: "parent-1",
      terminalId: "16000010",
      amount: 4200,
      cashRegisterId: "CR-01",
    });

    const call = mocked.last();
    expect(call.url).toBe(
      "https://demo-api.vivapayments.com/ecr/v1/transactions:preauth-completion",
    );
    const body = call.body as Record<string, unknown>;
    expect(body.parentSessionId).toBe("parent-1");
    expect(body.amount).toBe(4200);
    expect(body.merchantReference).toBe(`SDK-capture-${result.sessionId}`);
  });

  it("refund() targets transactions:refund with parentSessionId", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.refund({
      parentSessionId: "sale-1",
      terminalId: "16000010",
      amount: 1170,
      cashRegisterId: "CR-01",
    });

    const call = mocked.last();
    expect(call.url).toBe("https://demo-api.vivapayments.com/ecr/v1/transactions:refund");
    const body = call.body as Record<string, unknown>;
    expect(body.parentSessionId).toBe("sale-1");
    expect(body.merchantReference).toBe(`SDK-refund-${result.sessionId}`);
  });

  it("unreferencedRefund() targets transactions:unreferenced-refund", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.unreferencedRefund({
      terminalId: "16000010",
      amount: 1170,
      cashRegisterId: "CR-01",
    });

    const call = mocked.last();
    expect(call.url).toBe(
      "https://demo-api.vivapayments.com/ecr/v1/transactions:unreferenced-refund",
    );
    const body = call.body as Record<string, unknown>;
    expect(body.parentSessionId).toBeUndefined();
    expect(body.merchantReference).toBe(`SDK-unref-refund-${result.sessionId}`);
  });

  it("fastRefund() targets transactions:fast-refund", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.fastRefund({
      terminalId: "16000010",
      amount: 1170,
      cashRegisterId: "CR-01",
    });

    const call = mocked.last();
    expect(call.url).toBe("https://demo-api.vivapayments.com/ecr/v1/transactions:fast-refund");
    expect((call.body as Record<string, unknown>).merchantReference).toBe(
      `SDK-fast-refund-${result.sessionId}`,
    );
  });

  it("rebate() targets transactions:rebate", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.rebate({
      terminalId: "16000010",
      amount: 1170,
      cashRegisterId: "CR-01",
    });

    const call = mocked.last();
    expect(call.url).toBe("https://demo-api.vivapayments.com/ecr/v1/transactions:rebate");
    expect((call.body as Record<string, unknown>).merchantReference).toBe(
      `SDK-rebate-${result.sessionId}`,
    );
  });

  it("createAction() passes the payload through to /ecr/v1/actions", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 200, body: { actionId: "act-1" } }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.createAction({
      terminalId: "16000010",
      cashRegisterId: "CR-01",
      actionType: "aade-fim-control",
      request: {},
    });

    expect(result).toEqual({ actionId: "act-1" });
    const call = mocked.last();
    expect(call.url).toBe("https://demo-api.vivapayments.com/ecr/v1/actions");
    expect((call.body as Record<string, unknown>).actionType).toBe("aade-fim-control");
  });

  it("getAction() GETs /ecr/v1/actions/{id} (encoded)", async () => {
    const mocked = mockFetch([tokenResponse(), { status: 202 }]);
    const client = makeClient(mocked.fetch);

    const result = await client.transactions.getAction("act/1");

    expect(result).toEqual({}); // 202 empty body
    expect(mocked.last().method).toBe("GET");
    expect(mocked.last().url).toBe("https://demo-api.vivapayments.com/ecr/v1/actions/act%2F1");
  });
});
