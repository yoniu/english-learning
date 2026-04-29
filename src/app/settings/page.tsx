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

const defaultThemeColor = "#1677ff";
const defaultBackgroundSettings: BackgroundSettings = {
  imageUrl: "",
  blur: 0,
  scale: 1,
  imageOpacity: 0.16,
  glassBlur: 10,
  glassOpacity: 0.86,
};
const themeColorOptions = [
  "#1677ff",
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
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <h1 className="page-hero-title">设置</h1>
          <p className="page-hero-text">
            管理界面主题、背景效果和 AI 配置。当前页面只调整显示层和本地配置，不影响练习数据。
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="section-card">
          <div className="section-header">
            <div>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="section-title">基础设置</h2>
              </div>
              <p className="section-subtitle">
                调整主题色、背景和界面透明度，让视觉更适合你的使用习惯。
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <label className="form-field">
              <span>界面主题色</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  aria-label="界面主题色"
                  className="h-12 w-16 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-1"
                  onChange={(event) => updateThemeColor(event.target.value)}
                  type="color"
                  value={themeColor}
                />
                <input
                  className="field rounded-lg px-3 py-2 font-medium sm:max-w-48"
                  onChange={(event) => updateThemeColor(event.target.value)}
                  value={themeColor}
                />
                <button
                  className="secondary-button"
                  onClick={() => updateThemeColor(defaultThemeColor)}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
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

            <div className="divider-top space-y-4">
              <label className="form-field">
                <span>上传背景图片</span>
                <input
                  accept="image/*"
                  className="field rounded-lg px-3 py-3"
                  onChange={(event) => uploadBackgroundImage(event.target.files?.[0])}
                  type="file"
                />
              </label>

              <label className="form-field">
                <span>背景图片 URL 或上传后的图片数据</span>
                <input
                  className="field rounded-lg px-3 py-2"
                  onChange={(event) =>
                    updateBackgroundSettings({
                      ...backgroundSettings,
                      imageUrl: event.target.value,
                    })
                  }
                  placeholder="可以粘贴图片地址，也可以直接上传本地图片"
                  value={backgroundSettings.imageUrl}
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
                    背景透明度：{Math.round(backgroundSettings.imageOpacity * 100)}%
                  </span>
                  <input
                    className="accent-[var(--button)]"
                    max={1}
                    min={0}
                    onChange={(event) =>
                      updateBackgroundSettings({
                        ...backgroundSettings,
                        imageOpacity: Number(event.target.value),
                      })
                    }
                    step={0.01}
                    type="range"
                    value={backgroundSettings.imageOpacity}
                  />
                </label>

                <label className="form-field">
                  <span>
                    背景缩放：{Math.round(backgroundSettings.scale * 100)}%
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
                  <span>界面模糊：{backgroundSettings.glassBlur}px</span>
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
                className="secondary-button"
                onClick={() => updateBackgroundSettings(defaultBackgroundSettings)}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                清除背景
              </button>
            </div>
          </div>

          {baseError ? <div className="state-banner error mt-4">{baseError}</div> : null}
          {baseNotice ? <div className="state-banner info mt-4">{baseNotice}</div> : null}
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="section-title">AI 设置</h2>
              </div>
              <p className="section-subtitle">
                保存多个模型配置，随时切换当前使用的生成服务。
              </p>
            </div>
          </div>

          <div className="state-banner error mt-6">
            API Key 保存在浏览器 localStorage 中，仅适合个人本地使用。
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-4">
              <label className="form-field">
                <span>配置名称</span>
                <input
                  className="field rounded-lg px-3 py-2"
                  onChange={(event) =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      name: event.target.value,
                    }))
                  }
                  placeholder="例如 OpenAI、Gemini、DeepSeek"
                  value={profileDraft.name}
                />
              </label>

              <label className="form-field">
                <span>Base URL</span>
                <input
                  className="field rounded-lg px-3 py-2"
                  onChange={(event) =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      baseUrl: event.target.value,
                    }))
                  }
                  placeholder="例如 https://api.openai.com/v1"
                  value={profileDraft.baseUrl}
                />
              </label>

              <label className="form-field">
                <span>模型名称</span>
                <input
                  className="field rounded-lg px-3 py-2"
                  onChange={(event) =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      model: event.target.value,
                    }))
                  }
                  placeholder="例如 gpt-4o-mini"
                  value={profileDraft.model}
                />
              </label>

              <label className="form-field">
                <span>API Key</span>
                <input
                  className="field rounded-lg px-3 py-2"
                  onChange={(event) =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      apiKey: event.target.value,
                    }))
                  }
                  placeholder="填入服务商对应的 API Key"
                  type="password"
                  value={profileDraft.apiKey}
                />
              </label>

              <button className="primary-button w-full" onClick={saveProfile} type="button">
                {editingProfileId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingProfileId ? "更新配置" : "保存配置"}
              </button>

              {aiError ? <div className="state-banner error">{aiError}</div> : null}
              {aiNotice ? <div className="state-banner info">{aiNotice}</div> : null}
            </div>

            <div>
              <h3 className="section-title">AI 配置列表</h3>
              <div className="config-list mt-4">
                {profiles.length > 0 ? (
                  profiles.map((profile) => (
                    <article className="config-item" key={profile.id}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-lg font-semibold">
                            {profile.name}
                          </h4>
                          {activeProfile?.id === profile.id ? (
                            <span className="subtle-tag">当前使用</span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-[var(--muted)]">
                          {profile.baseUrl}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {profile.model}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="secondary-button"
                          onClick={() => switchProfile(profile.id)}
                          type="button"
                        >
                          切换
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => editProfile(profile)}
                          title="编辑 AI 配置"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state min-h-[220px]">
                    还没有 AI 配置。
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
