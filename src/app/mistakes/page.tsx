"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { loadMistakes, loadPracticeLists } from "@/lib/storage";
import type { MistakeRecord, PracticeList } from "@/types/app";

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([loadMistakes(), loadPracticeLists()])
      .then(([storedMistakes, storedLists]) => {
        setMistakes(storedMistakes);
        setLists(storedLists);
      })
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error ? caughtError.message : "读取错词失败。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const sortedMistakes = mistakes
    .slice()
    .sort((first, second) => second.count - first.count);

  function getListTitle(listId?: string): string {
    if (!listId) {
      return "未知练习列表";
    }

    return lists.find((list) => list.id === listId)?.title ?? "练习列表";
  }

  return (
    <section className="space-y-5">
      <div className="panel rounded-lg p-5">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-[var(--coral)]" />
          <h2 className="text-2xl font-black">错词</h2>
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
          拼写检查失败的单词会自动累计到这里。
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-4 text-sm font-bold text-[var(--coral)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg text-[var(--muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取错词
        </div>
      ) : sortedMistakes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sortedMistakes.map((mistake) => (
            <article className="panel rounded-lg p-4" key={mistake.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-black">{mistake.expected}</h3>
                <span className="rounded-full bg-[rgba(200,84,56,0.12)] px-3 py-1 text-sm font-black text-[var(--coral)]">
                  x{mistake.count}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
                最近输入：{mistake.word}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                {new Date(mistake.lastSeenAt).toLocaleString()}
              </p>
              {mistake.listId ? (
                <Link
                  className="mt-4 inline-flex rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-3 py-2 text-sm font-bold text-[var(--ink)] hover:bg-white"
                  href={`/practice/${mistake.listId}`}
                >
                  {getListTitle(mistake.listId)}
                </Link>
              ) : (
                <p className="mt-4 text-sm font-bold text-[var(--muted)]">
                  {getListTitle(mistake.listId)}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg p-6 text-center text-[var(--muted)]">
          还没有错词记录。
        </div>
      )}
    </section>
  );
}
