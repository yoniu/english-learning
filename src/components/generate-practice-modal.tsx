"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, X } from "lucide-react";
import { generatePracticeItems } from "@/lib/ai";
import {
  loadActiveProfileId,
  loadAiProfiles,
} from "@/lib/local-settings";
import { createPracticeList } from "@/lib/storage";
import type { AiProfile, PracticeList } from "@/types/app";

const levelOptions = [
  { value: "beginner", label: "初级" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "高级" },
];

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 8;
  }

  return Math.max(3, Math.min(20, Math.round(value)));
}

type GeneratePracticeModalProps = {
  open: boolean;
  onClose: () => void;
  onGenerated: (list: PracticeList) => void;
};

export function GeneratePracticeModal({
  open,
  onClose,
  onGenerated,
}: GeneratePracticeModalProps) {
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [topic, setTopic] = useState("daily conversations");
  const [level, setLevel] = useState("intermediate");
  const [count, setCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    setProfiles(loadAiProfiles());
    setActiveProfileId(loadActiveProfileId());
    setError("");
  }, [open]);

  async function handleGenerate() {
    setError("");

    if (!activeProfile) {
      setError("请先到设置页面保存一个 AI 配置。");
      return;
    }

    if (!topic.trim()) {
      setError("请输入练习主题。");
      return;
    }

    setGenerating(true);

    try {
      const generated = await generatePracticeItems(activeProfile, {
        topic: topic.trim(),
        level,
        count: clampCount(count),
      });

      if (generated.length === 0) {
        throw new Error("AI 没有返回可用的练习内容。");
      }

      const { list } = await createPracticeList({
        topic: topic.trim(),
        level,
        items: generated,
      });
      onGenerated(list);
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "生成练习内容失败。",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,49,45,0.42)] p-4">
      <section className="panel w-full max-w-xl rounded-lg p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--coral)]">
              Generate
            </p>
            <h2 className="mt-1 text-2xl font-black">生成练习集合</h2>
          </div>
          <button
            className="rounded-md border border-[rgba(23,49,45,0.12)] bg-white/70 p-2 hover:bg-white"
            onClick={onClose}
            type="button"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-black text-[var(--muted)]">
              当前 AI 配置
            </label>
            <div className="mt-2 rounded-md border border-[rgba(23,49,45,0.12)] bg-white/58 px-3 py-2 text-sm font-bold">
              {activeProfile ? activeProfile.name : "尚未配置"}
            </div>
          </div>

          <input
            className="field rounded-md px-3 py-2"
            placeholder="主题，例如 travel, interviews, cooking"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <select
              className="field rounded-md px-3 py-2"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="field rounded-md px-3 py-2"
              max={20}
              min={3}
              type="number"
              value={count}
              onBlur={() => setCount((value) => clampCount(value))}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>

          {error ? (
            <div className="rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-3 text-sm font-bold text-[var(--coral)]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Link
              className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-4 py-2 text-center font-bold text-[var(--ink)] hover:bg-white"
              href="/settings"
              onClick={onClose}
            >
              管理 AI 配置
            </Link>
            <button
              className="flex items-center justify-center gap-2 rounded-md bg-[var(--button)] px-5 py-2.5 font-black text-white transition hover:bg-[var(--button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={generating}
              onClick={handleGenerate}
              type="button"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              生成练习
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
