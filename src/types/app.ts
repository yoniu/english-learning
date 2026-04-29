export type PracticeKind = "phrase" | "sentence";

export type AiProfile = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type PracticeItem = {
  id: string;
  listId: string;
  kind: PracticeKind;
  text: string;
  zhHint: string;
  topic: string;
  marked: boolean;
};

export type GeneratedPracticeItem = Omit<
  PracticeItem,
  "id" | "listId" | "marked"
>;

export type PracticeList = {
  id: string;
  title: string;
  topic: string;
  level: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MistakeRecord = {
  id: string;
  word: string;
  expected: string;
  itemId: string;
  listId?: string;
  count: number;
  lastSeenAt: string;
  aiAnalysis?: MistakeAnalysis;
};

export type GenerationOptions = {
  topic: string;
  level: string;
  count: number;
  focusWords?: string[];
};

export type MistakeAnalysis = {
  phonetic: string;
  definition: string;
  example: string;
};

export type PracticeSession = {
  id: string;
  listId: string;
  startedAt: string;
  shuffledItemIds: string[];
};

export type PracticeEvaluation = {
  summary: string;
  strengths: string[];
  improvements: string[];
  encouragement: string;
};

export type PracticeRecord = {
  id: string;
  sessionId: string;
  listId: string;
  listTitle: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  hintCount: number;
  hintedItems: Array<{
    itemId: string;
    text: string;
    zhHint: string;
    count: number;
  }>;
  wrongWordCount: number;
  wrongSentenceCount: number;
  wrongItems: Array<{
    itemId: string;
    text: string;
    zhHint: string;
    userText?: string;
  }>;
  completedItemCount: number;
  evaluation?: PracticeEvaluation;
};
