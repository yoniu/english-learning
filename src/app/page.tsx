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
  unknown: "未知",
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
    <section className="space-y-5">
      <div className="panel flex flex-col justify-between gap-4 rounded-lg p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black">练习列表</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            每个列表是一组由 AI 生成的短句或短语集合。
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 rounded-md bg-[var(--coral)] px-5 py-3 font-black text-white transition hover:bg-[#a8422b]"
          onClick={() => setModalOpen(true)}
          type="button"
        >
          <Plus className="h-5 w-5" />
          生成练习列表
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-4 text-sm font-bold text-[var(--coral)]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="panel flex min-h-[360px] items-center justify-center rounded-lg text-[var(--muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取练习列表
        </div>
      ) : lists.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => (
            <article className="panel rounded-lg p-4" key={list.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[rgba(15,109,115,0.12)] px-3 py-1 text-xs font-black text-[var(--teal-dark)]">
                  {levelLabels[list.level] ?? list.level}
                </span>
                <Layers className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <h3 className="mt-4 text-2xl font-black leading-snug">
                {list.title}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-[var(--muted)]">
                <span className="flex items-center gap-1 rounded-full border border-[rgba(23,49,45,0.12)] bg-white/55 px-3 py-1">
                  <BookmarkCheck className="h-4 w-4" />
                  {list.itemCount} 条
                </span>
                <span className="flex items-center gap-1 rounded-full border border-[rgba(23,49,45,0.12)] bg-white/55 px-3 py-1">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(list.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Link
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--teal)] px-4 py-2.5 font-black text-white hover:bg-[var(--teal-dark)]"
                href={`/practice/${list.id}`}
                onClick={() => void saveActivePracticeListId(list.id)}
              >
                <Keyboard className="h-4 w-4" />
                开始练习
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel flex min-h-[420px] flex-col items-center justify-center rounded-lg p-6 text-center">
          <Database className="h-12 w-12 text-[var(--teal)]" />
          <h2 className="mt-4 text-2xl font-black">暂无练习列表</h2>
          <p className="mt-2 max-w-md text-[var(--muted)]">
            点击“生成练习列表”，创建一个包含短句和短语的集合。
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
