import { isoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import { monthOf, monthWeeks, nextDay } from "../src/month";

describe("nextDay", () => {
  it("月末・年末をまたぐ", () => {
    expect(nextDay(isoDate("2026-09-30"))).toBe("2026-10-01");
    expect(nextDay(isoDate("2026-12-31"))).toBe("2027-01-01");
  });
});

describe("monthOf", () => {
  it("属する月を返す", () => {
    expect(monthOf(isoDate("2026-09-05"))).toBe("2026-09");
  });
});

describe("monthWeeks", () => {
  it("日曜始まりで週ごとに並べ、月外は undefined で埋める", () => {
    // 2026-09-01 は火曜、2026-09-30 は水曜
    const weeks = monthWeeks("2026-09");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      undefined,
      undefined,
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
    expect(weeks[4]).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", undefined, undefined, undefined]);
  });

  it("日曜始まり・土曜終わりの月は埋めなしでちょうど収まる", () => {
    // 2026-02-01 は日曜、2026-02-28 は土曜
    const weeks = monthWeeks("2026-02");
    expect(weeks).toHaveLength(4);
    expect(weeks[0]![0]).toBe("2026-02-01");
    expect(weeks[3]![6]).toBe("2026-02-28");
  });
});
