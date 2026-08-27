import { getEnv } from "./env";
import { isoDate } from "./iso-date";

/** 今日の暦日を返す */
export const getToday = () => isoDate(new Intl.DateTimeFormat("en-CA", { timeZone: getEnv().TZ }).format(new Date()));
