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
  kind: PracticeKind;
  text: string;
  zhHint: string;
  topic: string;
  marked: boolean;
};

export type MistakeRecord = {
  id: string;
  word: string;
  expected: string;
  itemId: string;
  count: number;
  lastSeenAt: string;
};

export type GenerationOptions = {
  topic: string;
  level: string;
  count: number;
};
