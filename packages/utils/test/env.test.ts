import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnv } from "../src/env";

describe("getEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("TZ 未設定なら UTC になる", () => {
    vi.stubEnv("TZ", undefined);
    expect(getEnv().TZ).toBe("UTC");
  });

  it("TZ が設定されていればその値を返す", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    expect(getEnv().TZ).toBe("Asia/Tokyo");
  });

  it("TZ が空文字なら例外を投げる", () => {
    vi.stubEnv("TZ", "");
    expect(() => getEnv()).toThrow();
  });
});
