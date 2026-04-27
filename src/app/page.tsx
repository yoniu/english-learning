"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Check,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Volume2,
} from "lucide-react";
import { generatePracticeItems } from "@/lib/ai";
import {
  loadCurrentIndex,
  loadMistakes,
  loadPracticeItems,
  recordMistakes,
  replacePracticeItems,
  saveCurrentIndex,
  savePracticeItem,
} from "@/lib/storage";
import {
  loadActiveProfileId,
  loadAiProfiles,
  loadShowTextHint,
  saveActiveProfileId,
  saveAiProfiles,
  saveShowTextHint,
} from "@/lib/local-settings";
import { isWordCorrect, tokenizeText } from "@/lib/words";
import type { AiProfile, MistakeRecord, PracticeItem } from "@/types/app";

type ProfileDraft = Omit<AiProfile, "id">;

const blankProfileDraft: ProfileDraft = {
  name: "",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

const levelOptions = [
  { value: "beginner", label: "初级" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "高级" },
];

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 8;
  }

  return Math.max(3, Math.min(20, Math.round(value)));
}

export default function Home() {
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [profileDraft, setProfileDraft] =
    useState<ProfileDraft>(blankProfileDraft);
  const [topic, setTopic] = useState("daily conversations");
  const [level, setLevel] = useState("intermediate");
  const [count, setCount] = useState(8);
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [wordStatuses, setWordStatuses] = useState<
    Record<number, "correct" | "wrong">
  >({});
  const [showTextHint, setShowTextHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const currentItem = items[currentIndex];
  const tokens = currentItem ? tokenizeText(currentItem.text) : [];
  const markedItems = items.filter((item) => item.marked);

  useEffect(() => {
    async function hydrate() {
      setProfiles(loadAiProfiles());
      setActiveProfileId(loadActiveProfileId());
      setShowTextHint(loadShowTextHint());

      const [storedItems, storedIndex, storedMistakes] = await Promise.all([
        loadPracticeItems(),
        loadCurrentIndex(),
        loadMistakes(),
      ]);

      setItems(storedItems);
      setCurrentIndex(
        storedItems.length > 0
          ? Math.min(storedIndex, storedItems.length - 1)
          : 0,
      );
      setMistakes(storedMistakes);
      setLoading(false);
    }

    hydrate().catch((caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "读取本地学习数据失败。",
      );
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setAnswers(tokens.map(() => ""));
    setWordStatuses({});
    setNotice("");
  }, [currentItem?.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing) {
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        speakCurrentItem();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        void toggleCurrentMark();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        toggleTextHint();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void checkCurrentItem();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function updateProfiles(nextProfiles: AiProfile[], nextActiveId?: string) {
    setProfiles(nextProfiles);
    saveAiProfiles(nextProfiles);

    if (nextActiveId !== undefined) {
      setActiveProfileId(nextActiveId);
      saveActiveProfileId(nextActiveId);
    }
  }

  function saveProfile() {
    setError("");

    if (
      !profileDraft.name.trim() ||
      !profileDraft.baseUrl.trim() ||
      !profileDraft.apiKey.trim() ||
      !profileDraft.model.trim()
    ) {
      setError("请完整填写 AI 配置。");
      return;
    }

    if (editingProfileId) {
      const nextProfiles = profiles.map((profile) =>
        profile.id === editingProfileId
          ? {
              ...profile,
              ...profileDraft,
              name: profileDraft.name.trim(),
              baseUrl: profileDraft.baseUrl.trim(),
              apiKey: profileDraft.apiKey.trim(),
              model: profileDraft.model.trim(),
            }
          : profile,
      );
      updateProfiles(nextProfiles);
      setEditingProfileId("");
      setNotice("AI 配置已更新。");
    } else {
      const nextProfile: AiProfile = {
        id: createId(),
        name: profileDraft.name.trim(),
        baseUrl: profileDraft.baseUrl.trim(),
        apiKey: profileDraft.apiKey.trim(),
        model: profileDraft.model.trim(),
      };
      updateProfiles([...profiles, nextProfile], activeProfile?.id ?? nextProfile.id);
      setNotice("AI 配置已保存。");
    }

    setProfileDraft(blankProfileDraft);
  }

  function editProfile(profile: AiProfile) {
    setEditingProfileId(profile.id);
    setProfileDraft({
      name: profile.name,
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      model: profile.model,
    });
    setNotice("");
  }

  function switchProfile(profileId: string) {
    setActiveProfileId(profileId);
    saveActiveProfileId(profileId);
    setNotice("已切换当前 AI 配置。");
  }

  async function handleGenerate() {
    setError("");
    setNotice("");

    if (!activeProfile) {
      setError("请先保存并选择一个 AI 配置。");
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

      await replacePracticeItems(generated);
      setItems(generated);
      setCurrentIndex(0);
      setNotice(`已生成 ${generated.length} 条练习。`);
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

  function validateWord(index: number) {
    const token = tokens[index];

    if (!token || !answers[index]) {
      return;
    }

    setWordStatuses((current) => ({
      ...current,
      [index]: isWordCorrect(answers[index], token.word) ? "correct" : "wrong",
    }));
  }

  async function checkCurrentItem() {
    if (!currentItem || tokens.length === 0) {
      return;
    }

    const wrongWords = tokens
      .map((token, index) => ({
        token,
        index,
        answer: answers[index] ?? "",
      }))
      .filter(({ token, answer }) => !isWordCorrect(answer, token.word));

    const nextStatuses = tokens.reduce<Record<number, "correct" | "wrong">>(
      (statuses, token, index) => {
        statuses[index] = isWordCorrect(answers[index] ?? "", token.word)
          ? "correct"
          : "wrong";
        return statuses;
      },
      {},
    );
    setWordStatuses(nextStatuses);

    if (wrongWords.length > 0) {
      const nextMistakes = await recordMistakes(
        wrongWords.map(({ token, answer }) => ({
          word: answer,
          expected: token.word,
          itemId: currentItem.id,
        })),
      );
      setMistakes(nextMistakes);
      setNotice("还有拼写需要修正。");
      return;
    }

    const nextIndex = Math.min(currentIndex + 1, items.length - 1);
    await saveCurrentIndex(nextIndex);
    setCurrentIndex(nextIndex);
    setNotice(
      currentIndex + 1 >= items.length ? "练习已完成。" : "已进入下一条。",
    );
  }

  function speakCurrentItem() {
    if (!currentItem || !("speechSynthesis" in window)) {
      setError("当前浏览器不支持系统语音播放。");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentItem.text);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function toggleCurrentMark() {
    if (!currentItem) {
      return;
    }

    const updatedItem = {
      ...currentItem,
      marked: !currentItem.marked,
    };
    const nextItems = items.map((item) =>
      item.id === currentItem.id ? updatedItem : item,
    );

    await savePracticeItem(updatedItem);
    setItems(nextItems);
    setNotice(updatedItem.marked ? "已标记当前内容。" : "已取消标记。");
  }

  function toggleTextHint() {
    const nextValue = !showTextHint;
    setShowTextHint(nextValue);
    saveShowTextHint(nextValue);
  }

  function goToItem(index: number) {
    const nextIndex = Math.max(0, Math.min(index, items.length - 1));
    setCurrentIndex(nextIndex);
    void saveCurrentIndex(nextIndex);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[rgba(23,49,45,0.14)] pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral)]">
            AI English Spelling
          </p>
          <h1 className="mt-2 text-3xl font-black text-[var(--ink)] sm:text-5xl">
            主题生成，逐词拼写
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
          <span className="rounded-full border border-[rgba(15,109,115,0.22)] bg-white/55 px-3 py-2">
            {items.length} 条练习
          </span>
          <span className="rounded-full border border-[rgba(200,84,56,0.2)] bg-white/55 px-3 py-2">
            {mistakes.length} 个错词
          </span>
          <span className="rounded-full border border-[rgba(201,155,47,0.25)] bg-white/55 px-3 py-2">
            {markedItems.length} 个标记
          </span>
        </div>
      </header>

      <div className="grid flex-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <aside className="panel h-fit rounded-lg p-4">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[var(--teal)]" />
              <h2 className="text-lg font-black">AI 配置</h2>
            </div>

            <div className="rounded-md border border-[rgba(200,84,56,0.22)] bg-[rgba(200,84,56,0.08)] p-3 text-sm text-[var(--coral)]">
              API Key 保存在浏览器 localStorage 中，仅适合个人本地使用。
            </div>

            <div className="space-y-3">
              <input
                className="field rounded-md px-3 py-2"
                placeholder="配置名称"
                value={profileDraft.name}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    name: event.target.value,
                  }))
                }
              />
              <input
                className="field rounded-md px-3 py-2"
                placeholder="Base URL，例如 https://api.openai.com/v1"
                value={profileDraft.baseUrl}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    baseUrl: event.target.value,
                  }))
                }
              />
              <input
                className="field rounded-md px-3 py-2"
                placeholder="Model"
                value={profileDraft.model}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    model: event.target.value,
                  }))
                }
              />
              <input
                className="field rounded-md px-3 py-2"
                placeholder="API Key"
                type="password"
                value={profileDraft.apiKey}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    apiKey: event.target.value,
                  }))
                }
              />
              <button
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--teal)] px-4 py-2.5 font-bold text-white transition hover:bg-[var(--teal-dark)]"
                type="button"
                onClick={saveProfile}
              >
                {editingProfileId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingProfileId ? "更新配置" : "保存配置"}
              </button>
            </div>

            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  className="flex items-center justify-between gap-2 rounded-md border border-[rgba(23,49,45,0.12)] bg-white/55 p-2"
                  key={profile.id}
                >
                  <button
                    className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm font-bold ${
                      activeProfile?.id === profile.id
                        ? "bg-[rgba(15,109,115,0.13)] text-[var(--teal-dark)]"
                        : "text-[var(--ink)]"
                    }`}
                    type="button"
                    onClick={() => switchProfile(profile.id)}
                    title="切换当前 AI 配置"
                  >
                    {profile.name}
                  </button>
                  <button
                    className="rounded p-2 text-[var(--muted)] hover:bg-white"
                    type="button"
                    onClick={() => editProfile(profile)}
                    title="编辑 AI 配置"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 space-y-4 border-t border-[rgba(23,49,45,0.12)] pt-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--gold)]" />
              <h2 className="text-lg font-black">生成练习</h2>
            </div>
            <input
              className="field rounded-md px-3 py-2"
              placeholder="主题"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            />
            <div className="grid grid-cols-[1fr_96px] gap-3">
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
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--coral)] px-4 py-3 font-black text-white transition hover:bg-[#a8422b] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              生成短句和短语
            </button>
          </section>
        </aside>

        <section className="panel flex min-h-[620px] flex-col rounded-lg p-5 sm:p-6">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在读取本地数据
            </div>
          ) : currentItem ? (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-col justify-between gap-4 border-b border-[rgba(23,49,45,0.12)] pb-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[rgba(15,109,115,0.12)] px-3 py-1 text-sm font-bold text-[var(--teal-dark)]">
                      {currentItem.kind === "sentence" ? "短句" : "短语"}
                    </span>
                    <span className="text-sm font-semibold text-[var(--muted)]">
                      {currentIndex + 1} / {items.length}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-black leading-snug sm:text-4xl">
                    {currentItem.zhHint}
                  </p>
                  {showTextHint ? (
                    <p className="mt-2 text-lg font-bold text-[var(--coral)]">
                      {currentItem.text}
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 p-2 text-[var(--teal-dark)] hover:bg-white"
                    type="button"
                    onClick={speakCurrentItem}
                    title="播放语音"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <button
                    className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 p-2 text-[var(--gold)] hover:bg-white"
                    type="button"
                    onClick={() => void toggleCurrentMark()}
                    title="标记当前内容"
                  >
                    {currentItem.marked ? (
                      <BookmarkCheck className="h-5 w-5" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 p-2 text-[var(--coral)] hover:bg-white"
                    type="button"
                    onClick={toggleTextHint}
                    title="显示或隐藏英文提示"
                  >
                    {showTextHint ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-1 content-start items-start gap-x-3 gap-y-5 py-8">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-5">
                  {tokens.map((token, index) => (
                    <label className="flex items-end gap-1" key={`${token.word}-${index}`}>
                      <input
                        aria-label={`word-${index + 1}`}
                        className={`word-input rounded-md px-3 py-3 text-lg font-black ${
                          wordStatuses[index] ?? ""
                        }`}
                        value={answers[index] ?? ""}
                        onBlur={() => validateWord(index)}
                        onChange={(event) => {
                          const nextAnswers = [...answers];
                          nextAnswers[index] = event.target.value;
                          setAnswers(nextAnswers);
                        }}
                      />
                      {token.trailing ? (
                        <span className="pb-2 text-2xl font-black text-[var(--muted)]">
                          {token.trailing}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[rgba(23,49,45,0.12)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-[var(--muted)]">
                  {notice || "输入后失焦会即时校验，回车检查整条。"}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-[rgba(23,49,45,0.16)] bg-white/70 px-4 py-2 font-bold text-[var(--ink)] hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => goToItem(currentIndex - 1)}
                  >
                    上一条
                  </button>
                  <button
                    className="rounded-md bg-[var(--teal)] px-5 py-2 font-black text-white hover:bg-[var(--teal-dark)]"
                    type="button"
                    onClick={() => void checkCurrentItem()}
                  >
                    检查
                  </button>
                  <button
                    className="rounded-md border border-[rgba(23,49,45,0.16)] bg-white/70 px-4 py-2 font-bold text-[var(--ink)] hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={currentIndex >= items.length - 1}
                    onClick={() => goToItem(currentIndex + 1)}
                  >
                    下一条
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Database className="h-12 w-12 text-[var(--teal)]" />
              <h2 className="mt-4 text-2xl font-black">暂无练习集合</h2>
              <p className="mt-2 max-w-md text-[var(--muted)]">
                保存 AI 配置后输入主题，即可生成短句和短语练习。
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--coral)]" />
              <h2 className="text-lg font-black">错词</h2>
            </div>
            <div className="max-h-[310px] space-y-2 overflow-auto pr-1">
              {mistakes.length > 0 ? (
                mistakes
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((mistake) => (
                    <div
                      className="rounded-md border border-[rgba(200,84,56,0.16)] bg-white/58 p-3"
                      key={mistake.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-black">
                          {mistake.expected}
                        </span>
                        <span className="rounded-full bg-[rgba(200,84,56,0.1)] px-2 py-1 text-xs font-black text-[var(--coral)]">
                          x{mistake.count}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        最近输入：{mistake.word}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-[var(--muted)]">还没有错词记录。</p>
              )}
            </div>
          </section>

          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-[var(--gold)]" />
              <h2 className="text-lg font-black">标记</h2>
            </div>
            <div className="max-h-[310px] space-y-2 overflow-auto pr-1">
              {markedItems.length > 0 ? (
                markedItems.map((item) => (
                  <button
                    className="w-full rounded-md border border-[rgba(201,155,47,0.2)] bg-white/58 p-3 text-left hover:bg-white"
                    key={item.id}
                    type="button"
                    onClick={() => goToItem(items.findIndex((candidate) => candidate.id === item.id))}
                  >
                    <span className="text-sm font-bold text-[var(--muted)]">
                      {item.kind === "sentence" ? "短句" : "短语"}
                    </span>
                    <p className="mt-1 font-black">{item.text}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.zhHint}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">还没有标记内容。</p>
              )}
            </div>
          </section>

          {error ? (
            <section className="rounded-lg border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-4 text-sm font-bold text-[var(--coral)]">
              {error}
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
