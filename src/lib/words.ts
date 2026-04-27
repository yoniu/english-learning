export type WordToken = {
  word: string;
  trailing: string;
};

const wordPattern = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

export function tokenizeText(text: string): WordToken[] {
  const matches = [...text.matchAll(wordPattern)];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const nextStart =
      index + 1 < matches.length ? matches[index + 1].index ?? end : text.length;
    const trailing = text.slice(end, nextStart).replace(/\s+/g, "");

    return {
      word: match[0],
      trailing,
    };
  });
}

export function normalizeWord(value: string): string {
  return value.trim().replace(/[’]/g, "'").toLowerCase();
}

export function isWordCorrect(value: string, expected: string): boolean {
  return normalizeWord(value) === normalizeWord(expected);
}
