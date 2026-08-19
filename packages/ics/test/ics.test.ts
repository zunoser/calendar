import { isoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import { toIcs, type IcsEvent } from "../src/index";

const event = (overrides: Partial<IcsEvent> = {}): IcsEvent => ({
  id: "PVTI_1",
  title: "映画まどマギ 公開日",
  url: "https://github.com/zunoser/calendar/issues/7",
  startDate: isoDate("2026-08-28"),
  endDate: isoDate("2026-08-28"),
  updatedAt: "2026-08-18T18:52:54Z",
  ...overrides,
});

describe("toIcs", () => {
  it("イベントを全日 VEVENT に対応付ける (DTSTAMP は updatedAt)", () => {
    const ics = toIcs([event()], "calendar");
    expect(ics).toContain("NAME:calendar\r\n");
    expect(ics).toContain("UID:PVTI_1\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260828\r\n");
    expect(ics).toContain("DTSTAMP:20260818T185254Z\r\n");
    expect(ics).toContain("SUMMARY:映画まどマギ 公開日\r\n");
  });

  it("単日イベントは DTEND を省略する", () => {
    expect(toIcs([event()], "calendar")).not.toContain("DTEND");
  });

  it("期間イベントの DTEND は終了日の翌日 (非包含) になる", () => {
    const ics = toIcs([event({ startDate: isoDate("2026-12-29"), endDate: isoDate("2026-12-31") })], "calendar");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261229\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101\r\n");
  });
});
