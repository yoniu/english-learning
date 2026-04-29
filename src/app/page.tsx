"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  CalendarDays,
  Database,
  Keyboard,
  Layers,
  Loader2,
  Plus,
} from "lucide-react";

import { GeneratePracticeModal } from "@/components/generate-practice-modal";
import {
  loadPracticeLists,
  loadPracticeRecords,
  startPracticeSession,
} from "@/lib/storage";
import type { PracticeList, PracticeRecord } from "@/types/app";

const levelLabels: Record<string, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
  unknown: "未分类",
};

export default function PracticeListPage() {
  const router = useRouter();
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingListId, setStartingListId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([loadPracticeLists(), loadPracticeRecords()])
      .then(([storedLists, storedRecords]) => {
        setLists(storedLists);
        setRecords(storedRecords);
      })
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "读取练习列表失败，请稍后再试。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const practiceCountByListId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const record of records) {
      counts.set(record.listId, (counts.get(record.listId) ?? 0) + 1);
    }

    return counts;
  }, [records]);

  function addGeneratedList(list: PracticeList) {
    setLists((current) => [list, ...current]);
  }

  async function handleStartPractice(listId: string) {
    setError("");
    setStartingListId(listId);

    try {
      const session = await startPracticeSession(listId);
      router.push(`/practice?sessionId=${encodeURIComponent(session.id)}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "开始练习失败。",
      );
      setStartingListId("");
    }
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">练习列表</h1>
          <p className="page-hero-text">
            每次都从这里开始一轮新的练习。进入后系统会重新打乱顺序并开始计时。
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setModalOpen(true)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          生成练习列表
        </button>
      </div>

      {error ? <div className="state-banner error">{error}</div> : null}

      {loading ? (
        <div className="loading-state">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>正在读取练习列表</div>
        </div>
      ) : lists.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => {
            const starting = startingListId === list.id;
            const practiceCount = practiceCountByListId.get(list.id) ?? 0;

            return (
              <article className="list-card" key={list.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="subtle-tag">
                    {levelLabels[list.level] ?? list.level}
                  </span>
                  <Layers className="h-5 w-5 text-[var(--accent)]" />
                </div>

                <h2 className="mt-4 text-[1.4rem] font-semibold leading-8">
                  {list.title}
                </h2>

                <div className="meta-row mt-4">
                  <span className="meta-chip">
                    <BookmarkCheck className="h-4 w-4" />
                    {list.itemCount} 条内容
                  </span>
                  <span className="meta-chip">
                    <Keyboard className="h-4 w-4" />
                    练习 {practiceCount} 次
                  </span>
                  <span className="meta-chip">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(list.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <button
                  className="primary-button mt-6 w-full"
                  disabled={Boolean(startingListId)}
                  onClick={() => void handleStartPractice(list.id)}
                  type="button"
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Keyboard className="h-4 w-4" />
                  )}
                  开始练习
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Database className="h-12 w-12 text-[var(--accent)]" />
          <h2>还没有练习列表</h2>
          <p className="max-w-md">
            点击“生成练习列表”，创建一组适合当前学习阶段的短句和短语。
          </p>
        </div>
      )}

      <GeneratePracticeModal
        onClose={() => setModalOpen(false)}
        onGenerated={addGeneratedList}
        open={modalOpen}
      />
    </section>
  );
}
