// イベント配列に対する純粋な操作 (検査・絞り込み・整列)。

import type { IsoDate } from "@zunoser/utils";
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
