import { isoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import { monthOf, monthWeeks, nextDay, nextMonth } from "../src/month";

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

describe("nextMonth", () => {
  it("翌月を返し、年末は翌年の1月になる", () => {
    expect(nextMonth("2026-08")).toBe("2026-09");
    expect(nextMonth("2026-09")).toBe("2026-10");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
});

describe("monthWeeks", () => {
  it("月曜始まりで週ごとに並べ、月外は undefined で埋める", () => {
    // 2026-09-01 は火曜、2026-09-30 は水曜
    const weeks = monthWeeks("2026-09");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      undefined,
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
    expect(weeks[4]).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", undefined, undefined, undefined, undefined]);
  });

  it("月曜始まり・日曜終わりの月は埋めなしでちょうど収まる", () => {
    // 2026-06-01 は月曜、2026-06-28 は日曜、2026-06-30 は火曜
    const weeks = monthWeeks("2026-06");
    expect(weeks[0]![0]).toBe("2026-06-01");
    expect(weeks[3]![6]).toBe("2026-06-28");
  });
});
