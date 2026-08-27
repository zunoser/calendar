import { afterEach, describe, expect, it, vi } from "vitest";
import { getToday } from "../src/today";

describe("getToday", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("UTC では前日でも JST で日付が変わっていれば翌日になる", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T15:30:00Z")); // JST 2026-08-21 00:30
    expect(getToday()).toBe("2026-08-21");
  });

  it("JST で日付が変わる前は同日のまま", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T14:59:00Z")); // JST 2026-08-20 23:59
    expect(getToday()).toBe("2026-08-20");
  });

  it("TZ 未設定なら UTC で決める", () => {
    vi.stubEnv("TZ", undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T15:30:00Z"));
    expect(getToday()).toBe("2026-08-20");
  });
});
