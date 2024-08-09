import { z } from "zod";

export const lunchAiResponse = z.object({
  response: z.array(
    z.object({
      date: z.string(),
      text: z.string(),
    })
  ),
});
