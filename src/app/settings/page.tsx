"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Pencil, Plus, RotateCcw, Settings } from "lucide-react";
import {
  applyBackgroundSettings,
  applyThemeColor,
  loadActiveProfileId,
  loadAiProfiles,
  loadBackgroundSettings,
  loadThemeColor,
  saveActiveProfileId,
  saveAiProfiles,
  saveBackgroundSettings,
  saveThemeColor,
  type BackgroundSettings,
} from "@/lib/local-settings";
import type { AiProfile } from "@/types/app";

type ProfileDraft = Omit<AiProfile, "id">;

const blankProfileDraft: ProfileDraft = {
  name: "",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

const defaultThemeColor = "#525252";
const defaultBackgroundSettings: BackgroundSettings = {
  imageUrl: "",
  blur: 0,
  scale: 1,
  glassBlur: 22,
  glassOpacity: 0.68,
};
const themeColorOptions = [
  "#525252",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#c2410c",
  "#be123c",
];

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSettingsThemeColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim()
    : defaultThemeColor;
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [profileDraft, setProfileDraft] =
    useState<ProfileDraft>(blankProfileDraft);
  const [themeColor, setThemeColor] = useState(defaultThemeColor);
  const [backgroundSettings, setBackgroundSettings] =
    useState<BackgroundSettings>(defaultBackgroundSettings);
  const [baseNotice, setBaseNotice] = useState("");
  const [baseError, setBaseError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [aiError, setAiError] = useState("");

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  useEffect(() => {
    setProfiles(loadAiProfiles());
    setActiveProfileId(loadActiveProfileId());

    const storedThemeColor = loadThemeColor();
    setThemeColor(storedThemeColor);
    applyThemeColor(storedThemeColor);

    const storedBackgroundSettings = loadBackgroundSettings();
    setBackgroundSettings(storedBackgroundSettings);
    applyBackgroundSettings(storedBackgroundSettings);
  }, []);

  function updateProfiles(nextProfiles: AiProfile[], nextActiveId?: string) {
    setProfiles(nextProfiles);
    saveAiProfiles(nextProfiles);

    if (nextActiveId !== undefined) {
      setActiveProfileId(nextActiveId);
      saveActiveProfileId(nextActiveId);
    }
  }

  function saveProfile() {
    setAiError("");
    setAiNotice("");

    if (
      !profileDraft.name.trim() ||
      !profileDraft.baseUrl.trim() ||
      !profileDraft.apiKey.trim() ||
      !profileDraft.model.trim()
    ) {
      setAiError("请完整填写 AI 配置。");
      return;
    }

    if (editingProfileId) {
      const nextProfiles = profiles.map((profile) =>
        profile.id === editingProfileId
          ? {
              ...profile,
              name: profileDraft.name.trim(),
              baseUrl: profileDraft.baseUrl.trim(),
              apiKey: profileDraft.apiKey.trim(),
              model: profileDraft.model.trim(),
            }
          : profile,
      );
      updateProfiles(nextProfiles);
      setEditingProfileId("");
      setAiNotice("AI 配置已更新。");
    } else {
      const nextProfile: AiProfile = {
        id: createId(),
        name: profileDraft.name.trim(),
        baseUrl: profileDraft.baseUrl.trim(),
        apiKey: profileDraft.apiKey.trim(),
        model: profileDraft.model.trim(),
      };
      updateProfiles([...profiles, nextProfile], activeProfile?.id ?? nextProfile.id);
      setAiNotice("AI 配置已保存。");
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
    setAiNotice("");
    setAiError("");
  }

  function switchProfile(profileId: string) {
    setActiveProfileId(profileId);
    saveActiveProfileId(profileId);
    setAiNotice("已切换当前 AI 配置。");
    setAiError("");
  }

  function updateThemeColor(nextColor: string) {
    const normalizedColor = normalizeSettingsThemeColor(nextColor);
    setThemeColor(normalizedColor);
    saveThemeColor(normalizedColor);
    applyThemeColor(normalizedColor);
    setBaseNotice("主题色已更新。");
    setBaseError("");
  }

  function updateBackgroundSettings(nextSettings: BackgroundSettings) {
    setBackgroundSettings(nextSettings);
    saveBackgroundSettings(nextSettings);
    applyBackgroundSettings(nextSettings);
    setBaseNotice("背景设置已更新。");
    setBaseError("");
  }

  function uploadBackgroundImage(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setBaseError("请选择图片文件。");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateBackgroundSettings({
          ...backgroundSettings,
          imageUrl: reader.result,
        });
      }
    };
    reader.onerror = () => setBaseError("读取图片失败。");
    reader.readAsDataURL(file);
  }

  return (
    <section className="space-y-5">
      <div className="panel rounded-lg p-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-[var(--teal)]" />
          <h2 className="text-2xl font-black">基础设置</h2>
        </div>

        <div className="mt-5 space-y-6">
          <label className="form-field">
            <span>界面主题色</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                aria-label="界面主题色"
                className="h-12 w-16 rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 p-1"
                onChange={(event) => updateThemeColor(event.target.value)}
                type="color"
                value={themeColor}
              />
              <input
                className="field min-h-12 rounded-md px-3 py-2 font-bold sm:max-w-48"
                onChange={(event) => updateThemeColor(event.target.value)}
                value={themeColor}
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-4 py-3 font-bold text-[var(--ink)] hover:bg-white"
                onClick={() => updateThemeColor(defaultThemeColor)}
                type="button"
              >
                <RotateCcw className="h-5 w-5" />
                恢复默认
              </button>
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            {themeColorOptions.map((color) => (
              <button
                aria-label={`选择主题色 ${color}`}
                className={`h-8 w-8 rounded-full border-2 ${
                  themeColor.toLowerCase() === color
                    ? "border-[var(--ink)]"
                    : "border-[var(--line)]"
                }`}
                key={color}
                onClick={() => updateThemeColor(color)}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>

          <div className="space-y-4 border-t border-[rgba(23,49,45,0.12)] pt-5">
            <label className="form-field">
              <span>上传背景图片</span>
              <input
                accept="image/*"
                className="field rounded-md px-3 py-3"
                onChange={(event) =>
                  uploadBackgroundImage(event.target.files?.[0])
                }
                type="file"
              />
            </label>

            <label className="form-field">
              <span>背景图片 URL 或上传后的图片数据</span>
              <input
                className="field rounded-md px-3 py-2"
                placeholder="可粘贴图片地址，也可以直接上传本地图片"
                value={backgroundSettings.imageUrl}
                onChange={(event) =>
                  updateBackgroundSettings({
                    ...backgroundSettings,
                    imageUrl: event.target.value,
                  })
                }
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-field">
                <span>背景模糊：{backgroundSettings.blur}px</span>
                <input
                  className="accent-[var(--button)]"
                  max={24}
                  min={0}
                  onChange={(event) =>
                    updateBackgroundSettings({
                      ...backgroundSettings,
                      blur: Number(event.target.value),
                    })
                  }
                  type="range"
                  value={backgroundSettings.blur}
                />
              </label>

              <label className="form-field">
                <span>
                  背景放大：{Math.round(backgroundSettings.scale * 100)}%
                </span>
                <input
                  className="accent-[var(--button)]"
                  max={1.4}
                  min={1}
                  onChange={(event) =>
                    updateBackgroundSettings({
                      ...backgroundSettings,
                      scale: Number(event.target.value),
                    })
                  }
                  step={0.01}
                  type="range"
                  value={backgroundSettings.scale}
                />
              </label>

              <label className="form-field">
                <span>界面毛玻璃：{backgroundSettings.glassBlur}px</span>
                <input
                  className="accent-[var(--button)]"
                  max={36}
                  min={0}
                  onChange={(event) =>
                    updateBackgroundSettings({
                      ...backgroundSettings,
                      glassBlur: Number(event.target.value),
                    })
                  }
                  type="range"
                  value={backgroundSettings.glassBlur}
                />
              </label>

              <label className="form-field">
                <span>
                  界面透明度：
                  {Math.round((1 - backgroundSettings.glassOpacity) * 100)}%
                </span>
                <input
                  className="accent-[var(--button)]"
                  max={0.95}
                  min={0.18}
                  onChange={(event) =>
                    updateBackgroundSettings({
                      ...backgroundSettings,
                      glassOpacity: Number(event.target.value),
                    })
                  }
                  step={0.01}
                  type="range"
                  value={backgroundSettings.glassOpacity}
                />
              </label>
            </div>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-4 py-2.5 font-bold text-[var(--ink)] hover:bg-white"
              onClick={() => updateBackgroundSettings(defaultBackgroundSettings)}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              清除背景
            </button>
          </div>
        </div>

        {baseError ? (
          <div className="mt-4 rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-3 text-sm font-bold text-[var(--coral)]">
            {baseError}
          </div>
        ) : null}
        {baseNotice ? (
          <div className="mt-4 rounded-md border border-[rgba(15,109,115,0.2)] bg-[rgba(15,109,115,0.1)] p-3 text-sm font-bold text-[var(--teal-dark)]">
            {baseNotice}
          </div>
        ) : null}
      </div>

      <div className="panel rounded-lg p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-[var(--teal)]" />
          <h2 className="text-2xl font-black">AI 设置</h2>
        </div>

        <div className="mt-4 rounded-md border border-[rgba(200,84,56,0.22)] bg-[rgba(200,84,56,0.08)] p-3 text-sm font-bold text-[var(--coral)]">
          API Key 保存在浏览器 localStorage 中，仅适合个人本地使用。
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            <label className="form-field">
              <span>配置名称</span>
              <input
                className="field rounded-md px-3 py-2"
                placeholder="例如 OpenAI、Gemini、DeepSeek"
                value={profileDraft.name}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span>Base URL</span>
              <input
                className="field rounded-md px-3 py-2"
                placeholder="例如 https://api.openai.com/v1"
                value={profileDraft.baseUrl}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    baseUrl: event.target.value,
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span>模型名称</span>
              <input
                className="field rounded-md px-3 py-2"
                placeholder="例如 gpt-4o-mini"
                value={profileDraft.model}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    model: event.target.value,
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span>API Key</span>
              <input
                className="field rounded-md px-3 py-2"
                placeholder="填入对应服务商的 API Key"
                type="password"
                value={profileDraft.apiKey}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    apiKey: event.target.value,
                  }))
                }
              />
            </label>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--teal)] px-4 py-3 font-bold text-white transition hover:bg-[var(--teal-dark)]"
              onClick={saveProfile}
              type="button"
            >
              {editingProfileId ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingProfileId ? "更新配置" : "保存配置"}
            </button>

            {aiError ? (
              <div className="rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-3 text-sm font-bold text-[var(--coral)]">
                {aiError}
              </div>
            ) : null}
            {aiNotice ? (
              <div className="rounded-md border border-[rgba(15,109,115,0.2)] bg-[rgba(15,109,115,0.1)] p-3 text-sm font-bold text-[var(--teal-dark)]">
                {aiNotice}
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-xl font-black">AI 配置列表</h3>
            <div className="mt-4 space-y-3">
              {profiles.length > 0 ? (
                profiles.map((profile) => (
                  <article
                    className="flex flex-col gap-3 rounded-md border border-[rgba(23,49,45,0.12)] bg-white/58 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={profile.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-black">
                          {profile.name}
                        </h3>
                        {activeProfile?.id === profile.id ? (
                          <span className="rounded-full bg-[rgba(15,109,115,0.12)] px-2 py-1 text-xs font-black text-[var(--teal-dark)]">
                            当前使用
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-[var(--muted)]">
                        {profile.baseUrl}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                        {profile.model}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 px-3 py-2 font-bold text-[var(--ink)] hover:bg-white"
                        onClick={() => switchProfile(profile.id)}
                        type="button"
                      >
                        切换
                      </button>
                      <button
                        className="rounded-md border border-[rgba(23,49,45,0.14)] bg-white/70 p-2 text-[var(--muted)] hover:bg-white"
                        onClick={() => editProfile(profile)}
                        title="编辑 AI 配置"
                        type="button"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-[rgba(23,49,45,0.12)] bg-white/58 p-5 text-center text-[var(--muted)]">
                  还没有 AI 配置。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
