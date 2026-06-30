import { getOrBuildSnapshot } from "@/modules/analytics/service";
import { buildSystemPrompt } from "./prompt-builder";
import { templateAnswer } from "./template-fallback";
import OpenAI from "openai";

export async function askCoach(userId: string, question: string) {
  const snapshot = await getOrBuildSnapshot(userId);

  if (!snapshot) {
    return { answer: "Keep logging! Coach insights unlock after 2 weeks of data.", has_data: false };
  }

  const content = snapshot.content as Record<string, unknown>;

  // If no OpenAI key → use template-based answers (free, no LLM)
  if (!process.env.OPENAI_API_KEY) {
    const answer = templateAnswer(question, content);
    return { answer, has_data: true, tokens_used: 0, source: "template" };
  }

  // LLM path
  const systemPrompt = buildSystemPrompt(content);

  try {
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
    return { answer, has_data: true, tokens_used: completion.usage?.total_tokens, source: "ai" };
  } catch {
    // Fallback to template on LLM error
    const answer = templateAnswer(question, content);
    return { answer, has_data: true, tokens_used: 0, source: "template_fallback" };
  }
}
