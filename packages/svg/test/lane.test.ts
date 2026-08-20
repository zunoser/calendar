import { isoDate, type IsoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import { weekBars } from "../src/lane";
import { monthWeeks } from "../src/month";

// 2026-09 の第1週: [月外, 月外, 09-01 (火) 〜 09-05 (土)]
const week = monthWeeks("2026-09")[0]!;

const event = (startDate: string, endDate = startDate) => ({
  startDate: isoDate(startDate) as IsoDate,
  endDate: isoDate(endDate) as IsoDate,
});

describe("weekBars", () => {
  it("週にかかるイベントを列範囲の帯にする", () => {
    expect(weekBars(week, [event("2026-09-04", "2026-09-05")])).toEqual([
      { event: event("2026-09-04", "2026-09-05"), startCol: 5, span: 2, lane: 0 },
    ]);
  });

  it("週にかからないイベントは出さない", () => {
    expect(weekBars(week, [event("2026-09-10")])).toEqual([]);
  });

  it("週の途中から始まる月またぎイベントは月内の日だけに切り詰める", () => {
    const bars = weekBars(week, [event("2026-08-31", "2026-09-01")]);
    expect(bars).toEqual([{ event: event("2026-08-31", "2026-09-01"), startCol: 2, span: 1, lane: 0 }]);
  });

  it("重なるイベントは別レーンに積み、空いたレーンは再利用する", () => {
    const long = event("2026-09-01", "2026-09-03");
    const short = event("2026-09-01");
    const later = event("2026-09-05");
    const bars = weekBars(week, [short, long, later]);
    expect(bars).toEqual([
      { event: long, startCol: 2, span: 3, lane: 0 },
      { event: short, startCol: 2, span: 1, lane: 1 },
      { event: later, startCol: 6, span: 1, lane: 0 },
    ]);
  });
});
