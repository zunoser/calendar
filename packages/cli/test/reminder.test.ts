import { describe, expect, it } from "vitest";
import { reminderComment } from "../src/reminder";

describe("reminderComment", () => {
  it("担当者全員のメンションを含む3日前のコメントを作る", () => {
    expect(reminderComment(["alice", "bob"], "3d")).toBe("@alice @bob\n\n開始日の3日前です。");
  });

  it("1日前のコメントを作る", () => {
    expect(reminderComment(["alice"], "1d")).toBe("@alice\n\n開始日の1日前です。");
  });
});
