"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, Loader2 } from "lucide-react";
import {
  loadPracticeItems,
  loadPracticeLists,
  startPracticeSession,
} from "@/lib/storage";
import type { PracticeItem, PracticeList } from "@/types/app";

export default function MarkedPage() {
  const router = useRouter();
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingListId, setStartingListId] = useState("");
  const [error, setError] = useState("");

  const markedItems = items.filter((item) => item.marked);

  useEffect(() => {
    Promise.all([loadPracticeItems(), loadPracticeLists()])
      .then(([storedItems, storedLists]) => {
        setItems(storedItems);
        setLists(storedLists);
      })
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error ? caughtError.message : "读取标记内容失败。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function startPractice(item: PracticeItem) {
    setError("");
    setStartingListId(item.listId);

    try {
      const session = await startPracticeSession(item.listId);
      router.push(`/practice?sessionId=${encodeURIComponent(session.id)}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "开始练习失败。",
      );
      setStartingListId("");
    }
  }

  function getListTitle(listId: string): string {
    return lists.find((list) => list.id === listId)?.title ?? "练习列表";
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">标记内容</h1>
          <p className="page-hero-text">
            这里集中展示你在练习中手动标记的短句和短语，方便回头强化记忆。
          </p>
        </div>
      </div>

      {error ? <div className="state-banner error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>正在读取标记内容</div>
        </div>
      ) : markedItems.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {markedItems.map((item) => {
            const starting = startingListId === item.listId;

            return (
              <button
                className="list-card text-left"
                disabled={Boolean(startingListId)}
                key={item.id}
                onClick={() => void startPractice(item)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="kind-tag">
                    {item.kind === "sentence" ? "短句" : "短语"}
                  </span>
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {getListTitle(item.listId)}
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold leading-8">{item.text}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {item.zhHint}
                </p>
                {starting ? (
                  <span className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--accent)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在开始新练习
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <BookmarkCheck className="h-12 w-12 text-[var(--accent)]" />
          <h2>还没有标记内容</h2>
          <p>在练习页点击“标记”，这里就会自动收集起来。</p>
        </div>
      )}
    </section>
  );
}
