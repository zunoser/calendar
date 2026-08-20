import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config";
import { getGitHubCalendar } from "../src/service";

describe("getGitHubCalendar", () => {
  it("config.ci.jsonc の設定で実リポジトリの Issue からイベントを取得できる", async () => {
    const config = parseConfig(await readFile(new URL("../../../config.ci.jsonc", import.meta.url), "utf8"));
    const { getCalendar } = await getGitHubCalendar(config);
    const events = await Array.fromAsync(getCalendar());

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.id).toMatch(/^I_/);
      expect(event.title).not.toBe("");
      expect(["OPEN", "CLOSED"]).toContain(event.state);
      expect(event.labelColors.every((color) => /^[0-9a-f]{6}$/i.test(color))).toBe(true);
    }
    expect(events.some((event) => event.startDate !== undefined)).toBe(true);
  });
});
