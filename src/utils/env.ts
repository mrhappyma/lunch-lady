import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  AIRTABLE_KEY: z.string(),
  WEBHOOK_URL: z.string(),
  GOOGLE_AI_API_KEY: z.string(),
});
export default envSchema.parse(process.env);
