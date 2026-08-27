import { z } from "zod";

const envSchema = z.object({
  TZ: z.string().min(1).default("UTC"),
});

/** process.env を検証して返す */
export const getEnv = () => envSchema.parse(process.env);
