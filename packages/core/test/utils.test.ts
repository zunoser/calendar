import { isoDate, type IsoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../src/service";
import {
  addDays,
  checkEvent,
  filterDated,
  pastOpenEvents,
  reminderDueEvents,
  reminderMarker,
  sortByStartDate,
} from "../src/utils";

const event = (
  id: string,
  options: { startDate?: string; endDate?: string; state?: CalendarEvent["state"]; commentBodies?: string[] } = {},
): CalendarEvent => ({
  id,
  title: "t",
  body: "",
  url: "https://github.com/zunoser/calendar/issues/1",
  state: options.state ?? "OPEN",
  labelColors: [],
  assignees: ["alice", "bob"],
  status: "Next",
  location: undefined,
  startDate: options.startDate as IsoDate | undefined,
  endDate: options.endDate as IsoDate | undefined,
  commentBodies: options.commentBodies ?? [],
  updatedAt: "2026-08-18T18:00:00Z",
});

describe("checkEvent", () => {
  it("両方設定済みで順序が正しければ問題なし", () => {
    expect(checkEvent(event("a", { startDate: "2026-08-28", endDate: "2026-08-29" }))).toBeUndefined();
  });

  it("開始日 > 終了日は inverted", () => {
    expect(checkEvent(event("a", { startDate: "2026-08-29", endDate: "2026-08-28" }))).toBe("inverted");
  });

  it("両方未設定は missing", () => {
    expect(checkEvent(event("a"))).toBe("missing");
  });

  it("片方だけ設定は partial", () => {
    expect(checkEvent(event("a", { startDate: "2026-08-28" }))).toBe("partial");
    expect(checkEvent(event("a", { endDate: "2026-08-28" }))).toBe("partial");
  });
});

describe("pastOpenEvents", () => {
  it("終了日が過去で open なイベントだけを返す", () => {
    const past = event("past", { endDate: "2026-08-19" });
    const events = [
      past,
      event("today", { endDate: "2026-08-20" }),
      event("future", { endDate: "2026-08-21" }),
      event("closed", { endDate: "2026-08-19", state: "CLOSED" }),
      event("undated"),
    ];
    expect(pastOpenEvents(events, isoDate("2026-08-20"))).toEqual([past]);
  });
});

describe("filterDated", () => {
  it("開始日・終了日が両方あるイベントだけを返す", () => {
    const dated = event("a", { startDate: "2026-08-28", endDate: "2026-08-28" });
    expect(filterDated([dated, event("b"), event("c", { startDate: "2026-09-01" })])).toEqual([dated]);
  });
});

describe("sortByStartDate", () => {
  const day = (id: string, startDate: string, endDate = startDate) =>
    filterDated([event(id, { startDate, endDate })])[0]!;

  it("開始日 → 終了日 → ID の順でソートする", () => {
    const sorted = sortByStartDate([
      day("c", "2026-02-01"),
      day("b", "2026-01-01", "2026-01-02"),
      day("a2", "2026-01-01"),
      day("a1", "2026-01-01"),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["a1", "a2", "b", "c"]);
  });
});

describe("reminder", () => {
  it("addDays は ISO 暦日に日数を加算する (月・年の境界をまたぐ)", () => {
    expect(addDays(isoDate("2026-08-22"), 3)).toBe("2026-08-25");
    expect(addDays(isoDate("2026-08-30"), 3)).toBe("2026-09-02");
    expect(addDays(isoDate("2026-12-30"), 3)).toBe("2027-01-02");
  });
});

describe("reminderDueEvents", () => {
  const today = isoDate("2026-08-20");

  it("開始日がちょうど daysBefore 日前のイベントを対象にする", () => {
    const target = event("a", { startDate: "2026-08-23" });
    expect(reminderDueEvents([target], today, 3).map((e) => e.id)).toEqual(["a"]);
  });

  it("開始日が今日のイベントも対象にする (窓の下限)", () => {
    const target = event("a", { startDate: "2026-08-20" });
    expect(reminderDueEvents([target], today, 3).map((e) => e.id)).toEqual(["a"]);
  });

  it("開始日が窓の外 (today + daysBefore 超) は対象にしない", () => {
    const far = event("far", { startDate: "2026-08-24" });
    expect(reminderDueEvents([far], today, 3)).toEqual([]);
  });

  it("開始日が今日より前は対象にしない", () => {
    const past = event("past", { startDate: "2026-08-19" });
    expect(reminderDueEvents([past], today, 3)).toEqual([]);
  });

  it("担当者がいない・closed のイベントは対象にしない", () => {
    const unassigned = { ...event("unassigned", { startDate: "2026-08-23" }), assignees: [] };
    const closed = event("closed", { startDate: "2026-08-23", state: "CLOSED" });
    const undated = event("undated");
    expect(reminderDueEvents([unassigned, closed, undated], today, 3)).toEqual([]);
  });

  it("既に同じ daysBefore のマーカーがあるイベントは対象にしない", () => {
    const sent = event("sent", {
      startDate: "2026-08-23",
      commentBodies: [`@alice\n\n開始日の3日前です。\n\n${reminderMarker(3)}`],
    });
    expect(reminderDueEvents([sent], today, 3)).toEqual([]);
  });

  it("別の daysBefore のマーカーは無視する (3日前と1日前は別物)", () => {
    const oneDay = event("one", {
      startDate: "2026-08-21",
      commentBodies: [`@alice\n\n開始日の1日前です。\n\n${reminderMarker(1)}`],
    });
    expect(reminderDueEvents([oneDay], today, 3).map((e) => e.id)).toEqual(["one"]);
  });

  it("マーカーのないコメントは既送とみなさない", () => {
    const plain = event("plain", { startDate: "2026-08-23", commentBodies: ["普通のコメント"] });
    expect(reminderDueEvents([plain], today, 3).map((e) => e.id)).toEqual(["plain"]);
  });
});
