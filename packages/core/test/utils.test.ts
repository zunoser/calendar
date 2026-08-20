import { isoDate, type IsoDate } from "@zunoser/utils";
import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../src/service";
import {
  checkEvent,
  dateInTokyoAfterDays,
  filterDated,
  pastOpenEvents,
  reminderComment,
  reminderMarker,
  reminderTargets,
  sortByStartDate,
} from "../src/utils";

const event = (
  id: string,
  options: { startDate?: string; endDate?: string; state?: CalendarEvent["state"] } = {},
): CalendarEvent => ({
  id,
  title: "t",
  body: "",
  url: "https://github.com/zunoser/calendar/issues/1",
  state: options.state ?? "OPEN",
  assignees: ["alice", "bob"],
  comments: [],
  status: "Next",
  startDate: options.startDate as IsoDate | undefined,
  endDate: options.endDate as IsoDate | undefined,
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
  it("指定日時から3日後・1日後の日本時間の日付を返す", () => {
    expect(dateInTokyoAfterDays(new Date("2026-08-21T09:00:00Z"), 3)).toBe("2026-08-24");
    expect(dateInTokyoAfterDays(new Date("2026-08-21T09:00:00Z"), 1)).toBe("2026-08-22");
  });

  it("未通知で担当者のいる open Issue だけを対象にする", () => {
    const target = event("target", { startDate: "2026-08-22" });
    const sent = {
      ...event("sent", { startDate: "2026-08-22" }),
      comments: [reminderMarker("3d", isoDate("2026-08-22"))],
    };
    const unassigned = { ...event("unassigned", { startDate: "2026-08-22" }), assignees: [] };
    const closed = event("closed", { startDate: "2026-08-22", state: "CLOSED" });
    expect(reminderTargets([target, sent, unassigned, closed], isoDate("2026-08-22"), "3d")).toEqual([target]);
  });

  it("担当者全員のメンションと再送防止マーカーを含むコメントを作る", () => {
    expect(reminderComment(event("a", { startDate: "2026-08-22" }), "3d")).toBe(
      "@alice @bob\n\n開始日の3日前です。\n\n<!-- zunocal-reminder:3d:2026-08-22 -->",
    );
  });
});
