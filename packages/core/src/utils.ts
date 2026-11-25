// イベント配列に対する純粋な操作 (検査・絞り込み・整列)。

import { isoDate, type IsoDate } from "@zunoser/utils";
import type { CalendarEvent } from "./service";

/** 日付の整合性を検査する。問題がなければ undefined */
export const checkEvent = (event: CalendarEvent) => {
  const { startDate, endDate } = event;
  if (startDate === undefined && endDate === undefined) return "missing";
  if (startDate === undefined || endDate === undefined) return "partial";
  if (startDate > endDate) return "inverted";
  return undefined;
};

/** 終了日が today より前で、まだ open なイベントを返す */
export const pastOpenEvents = (events: readonly CalendarEvent[], today: IsoDate) =>
  events.filter((event) => event.endDate !== undefined && event.endDate < today && event.state === "OPEN");

type DatedCalendarEvent = CalendarEvent & { startDate: IsoDate; endDate: IsoDate };

/** 開始日・終了日が両方あるイベントだけを返す (型からも undefined が外れる) */
export const filterDated = (events: readonly CalendarEvent[]) =>
  events.filter((event): event is DatedCalendarEvent => event.startDate !== undefined && event.endDate !== undefined);

/** 開始日 → 終了日 → ID の順でソートした新しい配列を返す */
export const sortByStartDate = (events: readonly DatedCalendarEvent[]) =>
  events.toSorted(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.id.localeCompare(b.id),
  );

/**
 * リマインダーコメント末尾に付与するマーカー。担当者の変更や文言の差異に依存せず、
 * 「この開始日N日前の通知を既に送ったか」を判定するための一意な識別子。
 */
export const reminderMarker = (daysBefore: number) => `<!-- zunocal:remind:${daysBefore} -->`;

/** ISO 暦日文字列に days 日を加算した暦日を返す (UTC 基準の日付演算) */
export const addDays = (date: IsoDate, days: number): IsoDate => {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year!, month! - 1, day! + days));
  return isoDate(result.toISOString().slice(0, 10));
};

/**
 * リマインダー対象を返す。開始日が [today, today + daysBefore] の範囲にあり、
 * 未だ当該 daysBefore のマーカーを含むコメントがない open なイベントが対象。
 *
 * 完全一致 (startDate === today + daysBefore) ではなく窓判定にすることで、
 * スケジュール実行が遅延して対象日を過ぎても取りこぼさず、マーカーによる
 * 重複判定で同じ通知を二度送らない。
 */
export const reminderDueEvents = (events: readonly CalendarEvent[], today: IsoDate, daysBefore: number) =>
  events.filter((event) => {
    if (event.state !== "OPEN" || event.assignees.length === 0 || event.startDate === undefined) return false;
    const marker = reminderMarker(daysBefore);
    const alreadySent = event.commentBodies.some((body) => body.includes(marker));
    return !alreadySent && event.startDate >= today && event.startDate <= addDays(today, daysBefore);
  });
