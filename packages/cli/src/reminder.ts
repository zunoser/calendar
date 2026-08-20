export type ReminderKind = "3d" | "1d";

export const reminderComment = (assignees: readonly string[], kind: ReminderKind) => {
  const mentions = assignees.map((login) => `@${login}`).join(" ");
  const timing = kind === "3d" ? "3日前" : "1日前";
  return `${mentions}\n\n開始日の${timing}です。`;
};
