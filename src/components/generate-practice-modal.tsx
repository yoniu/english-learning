"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, X } from "lucide-react";

import { generatePracticeItems } from "@/lib/ai";
import { loadActiveProfileId, loadAiProfiles } from "@/lib/local-settings";
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
  focusWords?: string[];
  initialTopic?: string;
  listTitle?: string;
};

export function GeneratePracticeModal({
  open,
  onClose,
  onGenerated,
  focusWords = [],
  initialTopic,
  listTitle,
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
  const normalizedFocusWords = Array.from(
    new Set(focusWords.map((word) => word.trim()).filter(Boolean)),
  );
  const hasFocusWords = normalizedFocusWords.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setProfiles(loadAiProfiles());
    setActiveProfileId(loadActiveProfileId());
    setTopic(initialTopic?.trim() || "daily conversations");
    setError("");
  }, [initialTopic, open]);

  async function handleGenerate() {
    setError("");

    if (!activeProfile) {
      setError("请先在设置页保存一个 AI 配置。");
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
        focusWords: normalizedFocusWords,
      });

      if (generated.length === 0) {
        throw new Error("AI 没有返回可用的练习内容。");
      }

      const { list } = await createPracticeList({
        title: listTitle,
        topic: topic.trim(),
        level,
        items: generated,
      });

      onGenerated(list);
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "生成练习内容失败。",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-surface max-w-2xl">
        <div className="section-header">
          <div>
            <h2 className="section-title">生成练习集合</h2>
            <p className="section-subtitle">
              设定主题、难度和数量，系统会生成可直接进入练习的内容。
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            title="关闭"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="form-field">
            <span>当前 AI 配置</span>
            <div className="field flex items-center rounded-lg px-3 text-sm font-medium">
              {activeProfile ? activeProfile.name : "尚未配置"}
            </div>
          </div>

          {hasFocusWords ? (
            <div className="form-field">
              <span>错词范围</span>
              <div className="field rounded-lg px-3 py-3 text-sm leading-6">
                {normalizedFocusWords.join("、")}
              </div>
            </div>
          ) : null}

          <label className="form-field">
            <span>练习主题</span>
            <input
              className="field rounded-lg px-3 py-2"
              onChange={(event) => setTopic(event.target.value)}
              placeholder={
                hasFocusWords
                  ? "例如 mistakes review、daily review"
                  : "例如 travel、interviews、cooking"
              }
              value={topic}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="form-field">
              <span>难度等级</span>
              <select
                className="field rounded-lg px-3 py-2"
                onChange={(event) => setLevel(event.target.value)}
                value={level}
              >
                {levelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>生成数量</span>
              <input
                className="field rounded-lg px-3 py-2"
                max={20}
                min={3}
                onBlur={() => setCount((value) => clampCount(value))}
                onChange={(event) => setCount(Number(event.target.value))}
                type="number"
                value={count}
              />
            </label>
          </div>

          {error ? <div className="state-banner error">{error}</div> : null}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="secondary-button"
              href="/settings"
              onClick={onClose}
            >
              管理 AI 配置
            </Link>

            <button
              className="primary-button"
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
