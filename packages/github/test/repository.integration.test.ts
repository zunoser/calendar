import { describe, expect, it } from "vitest";
import { createGitHubGraphQL } from "../src/repository";

const token = process.env.TOKEN;
if (!token) {
  throw new Error("TOKEN is required for integration tests");
}

const github = createGitHubGraphQL({ token, userAgent: "zunoser-calendar-integration" });
const project = { org: "zunoser", number: 3 };

describe("createGitHubGraphQL", () => {
  it("iterateProjectItems が実 Project のアイテムを返す", async () => {
    const items = await Array.fromAsync(github.iterateProjectItems({ project }));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.id).toMatch(/^PVTI_/);
      expect(Date.parse(item.updatedAt)).not.toBeNaN();
    }
  });

  it("fetchStatusField が Status フィールドと選択肢を返す", async () => {
    const field = await github.fetchStatusField(project);
    expect(field.projectId).toMatch(/^PVT_/);
    expect(field.fieldId).toMatch(/^PVTSSF_/);
    expect(field.options.map(({ name }) => name)).toEqual(expect.arrayContaining(["Next", "Done", "Error"]));
  });
});
