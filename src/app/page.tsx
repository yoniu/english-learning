"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { loadPracticeLists, saveActivePracticeListId } from "@/lib/storage";
import type { PracticeList } from "@/types/app";

const levelLabels: Record<string, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
  unknown: "未分类",
};

export default function PracticeListPage() {
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPracticeLists()
      .then((storedLists) => setLists(storedLists))
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "读取练习列表失败。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  function addGeneratedList(list: PracticeList) {
    setLists((current) => [list, ...current]);
  }

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">练习列表</h1>
          <p className="page-hero-text">
            每个练习列表都是一组由 AI 生成的短句或短语。先选一个主题，再进入拼写练习与错词复盘。
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
          {lists.map((list) => (
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
                  <CalendarDays className="h-4 w-4" />
                  {new Date(list.createdAt).toLocaleDateString()}
                </span>
              </div>

              <Link
                className="primary-button mt-6 w-full"
                href={`/practice?listId=${encodeURIComponent(list.id)}`}
                onClick={() => void saveActivePracticeListId(list.id)}
              >
                <Keyboard className="h-4 w-4" />
                开始练习
              </Link>
            </article>
          ))}
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
