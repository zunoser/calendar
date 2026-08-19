// iCalendar (RFC 5545) の生成。エスケープ・折り返し・構造は ical-generator に任せ、
// ここでは日付の変換 (包含 → 非包含) とフィールドの対応付けだけを行う。

import { isoDate, type IsoDate } from "@zunoser/utils";
import ical, { ICalCalendarMethod } from "ical-generator";

export interface IcsEvent {
  id: string;
  title: string;
  body: string;
  url: string;
  startDate: IsoDate;
  /** この日を含む */
  endDate: IsoDate;
  updatedAt: string;
}

// 終了日 (含む) の翌日。RFC 5545 の DTEND は非包含なのでこれを渡す
const nextDay = (date: IsoDate) =>
  isoDate(new Date(Date.parse(`${date}T00:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

/** 全日イベントの一覧から iCalendar テキストを生成する */
export const toIcs = (events: readonly IcsEvent[], calendarName: string) => {
  const calendar = ical({
    name: calendarName,
    prodId: { company: "zunoser", product: "calendar", language: "EN" },
    method: ICalCalendarMethod.PUBLISH,
  });
  for (const event of events) {
    calendar.createEvent({
      id: event.id,
      allDay: true,
      start: event.startDate,
      // 単日は DTEND を省略する (DATE 値の DTSTART の既定 duration は1日)
      ...(event.endDate === event.startDate ? {} : { end: nextDay(event.endDate) }),
      summary: event.title,
      url: event.url,
      description: event.body === "" ? event.url : `${event.body}\n\n${event.url}`,
      stamp: event.updatedAt,
    });
  }
  return `${calendar.toString()}\r\n`;
};
