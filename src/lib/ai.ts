import type {
  AiProfile,
  GeneratedPracticeItem,
  GenerationOptions,
  MistakeAnalysis,
  PracticeEvaluation,
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

type PracticeEvaluationPayload = {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  encouragement?: string;
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

function parseJson<T>(content: string): T {
  const fencedJson = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedJson ? fencedJson[1] : content;
  return JSON.parse(jsonText.trim()) as T;
}

export async function generatePracticeItems(
  profile: AiProfile,
  options: GenerationOptions,
): Promise<GeneratedPracticeItem[]> {
  const uniqueFocusWords = Array.from(
    new Set(options.focusWords?.map((word) => word.trim()).filter(Boolean) ?? []),
  );

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
            uniqueFocusWords.length > 0
              ? `Target words: ${uniqueFocusWords.join(", ")}`
              : "",
            uniqueFocusWords.length > 0
              ? "Every item must include at least one target word. Cover all target words where possible and focus on their common usage."
              : "",
            'Return exactly this JSON shape: {"items":[{"kind":"phrase"|"sentence","text":"English text","zhHint":"Chinese meaning"}]}',
            "Use natural English, keep every item under 14 words, and make zhHint concise Simplified Chinese.",
          ]
            .filter(Boolean)
            .join("\n"),
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

  const payload = parseJson<GeneratedPayload>(content);
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

  const payload = parseJson<MistakeAnalysisPayload>(content);
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

export async function generatePracticeEvaluation(
  profile: AiProfile,
  params: {
    listTitle: string;
    durationSeconds: number;
    completedItemCount: number;
    hintCount: number;
    hintedItems: Array<{
      text: string;
      zhHint: string;
      count: number;
    }>;
    wrongWordCount: number;
    wrongSentenceCount: number;
    wrongItems: Array<{
      text: string;
      zhHint: string;
      userText?: string;
    }>;
  },
): Promise<PracticeEvaluation> {
  const response = await fetch(buildChatCompletionsUrl(profile.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${profile.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: profile.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are an English learning coach. Return only valid JSON. Do not include markdown, comments, or extra text.",
        },
        {
          role: "user",
          content: [
            "Create a concise practice review for a Chinese learner.",
            `Practice list: ${params.listTitle}`,
            `Duration seconds: ${params.durationSeconds}`,
            `Completed items: ${params.completedItemCount}`,
            `Hint count: ${params.hintCount}`,
            `Hinted items: ${
              params.hintedItems.length > 0
                ? params.hintedItems
                    .map(
                      (item) => `${item.text} (${item.zhHint}) x${item.count}`,
                    )
                    .join("; ")
                : "none"
            }`,
            `Wrong word count: ${params.wrongWordCount}`,
            `Wrong sentence count: ${params.wrongSentenceCount}`,
            `Wrong items: ${
              params.wrongItems.length > 0
                ? params.wrongItems
                    .map(
                      (item) =>
                        `${item.text} (${item.zhHint}) -> learner wrote: ${
                          item.userText?.trim() || "unknown"
                        }`,
                    )
                    .join("; ")
                : "none"
            }`,
            'Return exactly this JSON shape: {"summary":"one short Simplified Chinese summary","strengths":["two short Simplified Chinese bullets"],"improvements":["two short Simplified Chinese bullets"],"encouragement":"one short encouraging Simplified Chinese sentence"}',
            "Be specific to the stats, hinted items, and wrong items. When learner input is provided, explain likely spelling confusions or missing words based on that input. Keep each item concise and natural.",
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

  const payload = parseJson<PracticeEvaluationPayload>(content);

  return {
    summary: payload.summary?.trim() || "已完成本次练习，继续保持。",
    strengths:
      payload.strengths?.filter((item) => item.trim()).slice(0, 3) ?? [
        "完成了整组练习。",
      ],
    improvements:
      payload.improvements?.filter((item) => item.trim()).slice(0, 3) ?? [
        "继续关注易错拼写。",
      ],
    encouragement:
      payload.encouragement?.trim() || "继续下一轮练习，你会越来越稳。",
  };
}
