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
};

export type GenerationOptions = {
  topic: string;
  level: string;
  count: number;
};
