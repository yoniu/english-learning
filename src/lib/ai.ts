import type {
  AiProfile,
  GeneratedPracticeItem,
  GenerationOptions,
  MistakeAnalysis,
} from "@/types/app";

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

type MistakeAnalysisPayload = {
  items?: Array<{
    word?: string;
    phonetic?: string;
    definition?: string;
    example?: string;
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

function parseMistakeAnalysisContent(content: string): MistakeAnalysisPayload {
  const fencedJson = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedJson ? fencedJson[1] : content;
  return JSON.parse(jsonText.trim()) as MistakeAnalysisPayload;
}

export async function generatePracticeItems(
  profile: AiProfile,
  options: GenerationOptions,
): Promise<GeneratedPracticeItem[]> {
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
    .map((item) => ({
      kind: item.kind as "phrase" | "sentence",
      text: item.text!.trim(),
      zhHint: item.zhHint!.trim(),
      topic: options.topic.trim(),
    }));
}

export async function generateMistakeAnalyses(
  profile: AiProfile,
  words: string[],
): Promise<Record<string, MistakeAnalysis>> {
  const uniqueWords = Array.from(
    new Set(words.map((word) => word.trim()).filter(Boolean)),
  );

  if (uniqueWords.length === 0) {
    return {};
  }

  const response = await fetch(buildChatCompletionsUrl(profile.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${profile.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You help Chinese learners understand English vocabulary. Return only valid JSON. Do not include markdown, comments, or extra text.",
        },
        {
          role: "user",
          content: [
            "Analyze these English words for a wrong-words notebook.",
            `Words: ${uniqueWords.join(", ")}`,
            'Return exactly this JSON shape: {"items":[{"word":"original word","phonetic":"IPA phonetic with slashes","definition":"concise Simplified Chinese explanation","example":"short natural English example sentence"}]}',
            "Keep definition concise, use Simplified Chinese, and keep each example under 14 words.",
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

  const payload = parseMistakeAnalysisContent(content);
  const analyses: Record<string, MistakeAnalysis> = {};

  for (const item of payload.items ?? []) {
    if (
      typeof item.word === "string" &&
      typeof item.phonetic === "string" &&
      typeof item.definition === "string" &&
      typeof item.example === "string"
    ) {
      analyses[item.word.trim().toLowerCase()] = {
        phonetic: item.phonetic.trim(),
        definition: item.definition.trim(),
        example: item.example.trim(),
      };
    }
  }

  return analyses;
}
