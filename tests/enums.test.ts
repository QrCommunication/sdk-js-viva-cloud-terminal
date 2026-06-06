import { describe, expect, it } from "vitest";
import {
  EcrEventId,
  ecrEventIdFrom,
  ecrEventLabel,
  isInProgress,
  isTerminalEvent,
  isSuccessfulEvent,
} from "../src/enums.js";

describe("EcrEventId helpers", () => {
  it("maps known numeric values", () => {
    expect(ecrEventIdFrom(0)).toBe(EcrEventId.SUCCESS);
    expect(ecrEventIdFrom(1100)).toBe(EcrEventId.IN_PROGRESS);
    expect(ecrEventIdFrom(6000)).toBe(EcrEventId.BAD_PARAMS);
  });

  it("returns null for unknown or nullish values", () => {
    expect(ecrEventIdFrom(9999)).toBeNull();
    expect(ecrEventIdFrom(null)).toBeNull();
    expect(ecrEventIdFrom(undefined)).toBeNull();
  });

  it("treats IN_PROGRESS as the only non-terminal event", () => {
    expect(isInProgress(EcrEventId.IN_PROGRESS)).toBe(true);
    expect(isInProgress(EcrEventId.SUCCESS)).toBe(false);
    expect(isTerminalEvent(EcrEventId.IN_PROGRESS)).toBe(false);
    expect(isTerminalEvent(EcrEventId.DECLINED)).toBe(true);
  });

  it("flags only SUCCESS as successful", () => {
    expect(isSuccessfulEvent(EcrEventId.SUCCESS)).toBe(true);
    expect(isSuccessfulEvent(EcrEventId.DECLINED)).toBe(false);
  });

  it("returns human-readable labels", () => {
    expect(ecrEventLabel(EcrEventId.SUCCESS)).toBe("Transaction successful");
    expect(ecrEventLabel(EcrEventId.DECLINED)).toBe("Transaction declined");
    expect(ecrEventLabel(EcrEventId.IN_PROGRESS)).toBe("In progress");
  });
});
