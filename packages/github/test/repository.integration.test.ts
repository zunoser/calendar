import { describe, expect, it } from "vitest";
import { createGitHubGraphQL } from "../src/repository";

const token = process.env.TOKEN;
if (!token) {
  throw new Error("TOKEN is required for integration tests");
}

const github = createGitHubGraphQL({ token, userAgent: "zunoser-calendar-integration" });
const repository = { owner: "zunoser", name: "calendar" };

describe("createGitHubGraphQL", () => {
  it("iterateIssues が実リポジトリの Issue を返す", async () => {
    const issues = await Array.fromAsync(github.iterateIssues({ repository }));
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.id).toMatch(/^I_/);
      expect(Date.parse(issue.updatedAt)).not.toBeNaN();
    }
  });

  it("fetchSingleSelectField が Date status フィールドと選択肢を返す", async () => {
    const field = await github.fetchSingleSelectField(repository, "Date status");
    expect(field.fieldId).toMatch(/^IFSS_/);
    expect(field.options.map(({ name }) => name)).toEqual(expect.arrayContaining(["Next", "Error"]));
  });
});
