import { getOrBuildSnapshot } from "@/modules/analytics/service";
import { buildSystemPrompt } from "./prompt-builder";
import OpenAI from "openai";

export async function askCoach(userId: string, question: string) {
  const snapshot = await getOrBuildSnapshot(userId);

  if (!snapshot) {
    return { answer: "Keep logging! Coach insights unlock after 2 weeks of data.", has_data: false };
  }

  const systemPrompt = buildSystemPrompt(snapshot.content as Record<string, unknown>);

  try {
    // Lazy init — avoids build-time crash when OPENAI_API_KEY not set
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });

    const answer = completion.choices[0]?.message?.content ?? "No response.";
    return { answer, has_data: true, tokens_used: completion.usage?.total_tokens };
  } catch {
    return { answer: "Coach is temporarily unavailable. Your analytics are still ready — check your dashboard.", has_data: true };
  }
}
