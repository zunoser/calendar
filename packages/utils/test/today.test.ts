import { afterEach, describe, expect, it, vi } from "vitest";
import { todayInTokyo } from "../src/today";

describe("todayInTokyo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("UTC では前日でも JST で日付が変わっていれば翌日になる", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T15:30:00Z")); // JST 2026-08-21 00:30
    expect(todayInTokyo()).toBe("2026-08-21");
  });

  it("JST で日付が変わる前は同日のまま", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T14:59:00Z")); // JST 2026-08-20 23:59
    expect(todayInTokyo()).toBe("2026-08-20");
  });
});
