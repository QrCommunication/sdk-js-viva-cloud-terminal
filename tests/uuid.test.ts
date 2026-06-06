import { describe, expect, it } from "vitest";
import { generateUuid } from "../src/uuid.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateUuid", () => {
  it("produces an RFC 4122 v4 UUID", () => {
    expect(generateUuid()).toMatch(UUID_V4);
  });

  it("produces unique values", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateUuid()));
    expect(set.size).toBe(100);
  });
});
