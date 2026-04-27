import type { AiProfile, GenerationOptions, PracticeItem } from "@/types/app";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GeneratedPayload = {
  items?: Array<{
    kind?: string;
    text?: string;
    zhHint?: string;
  }>;
};

function buildChatCompletionsUrl(baseUrl: string): string {
  const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (cleanBaseUrl.endsWith("/chat/completions")) {
    return cleanBaseUrl;
  }

  if (cleanBaseUrl.endsWith("/v1")) {
    return `${cleanBaseUrl}/chat/completions`;
  }

  return `${cleanBaseUrl}/v1/chat/completions`;
}

function parseJsonContent(content: string): GeneratedPayload {
  const fencedJson = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedJson ? fencedJson[1] : content;
  return JSON.parse(jsonText.trim()) as GeneratedPayload;
}

export async function generatePracticeItems(
  profile: AiProfile,
  options: GenerationOptions,
): Promise<PracticeItem[]> {
  const response = await fetch(buildChatCompletionsUrl(profile.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${profile.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You create English learning practice content. Return only valid JSON. Do not include markdown, comments, or extra text.",
        },
        {
          role: "user",
          content: [
            `Topic: ${options.topic}`,
            `Level: ${options.level}`,
            `Count: ${options.count}`,
            "Generate a mixed list of short English phrases and short English sentences for spelling practice.",
            'Return exactly this JSON shape: {"items":[{"kind":"phrase"|"sentence","text":"English text","zhHint":"Chinese meaning"}]}',
            "Use natural English, keep every item under 14 words, and make zhHint concise Simplified Chinese.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `AI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI response did not include message content.");
  }

  const payload = parseJsonContent(content);
  const generatedItems = payload.items;

  if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
    throw new Error("AI response JSON did not include any practice items.");
  }

  return generatedItems
    .filter(
      (item) =>
        (item.kind === "phrase" || item.kind === "sentence") &&
        typeof item.text === "string" &&
        item.text.trim().length > 0 &&
        typeof item.zhHint === "string" &&
        item.zhHint.trim().length > 0,
    )
    .slice(0, options.count)
    .map((item, index) => ({
      id: `${Date.now()}-${index}`,
      kind: item.kind as "phrase" | "sentence",
      text: item.text!.trim(),
      zhHint: item.zhHint!.trim(),
      topic: options.topic.trim(),
      marked: false,
    }));
}
