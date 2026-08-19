import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config";
import { getGitHubCalendar } from "../src/service";

describe("getGitHubCalendar", () => {
  it("config.ci.jsonc の設定で実 Project からイベントを取得できる", async () => {
    const config = parseConfig(await readFile(new URL("../../../config.ci.jsonc", import.meta.url), "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = await Array.fromAsync(getCalendar());

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.id).toMatch(/^PVTI_/);
      expect(event.issueId).toMatch(/^I_/);
      expect(event.title).not.toBe("");
      expect(["OPEN", "CLOSED"]).toContain(event.state);
    }
    expect(events.some((event) => event.startDate !== undefined)).toBe(true);
  });
});
