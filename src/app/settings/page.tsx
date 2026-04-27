"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Settings } from "lucide-react";
import {
  loadActiveProfileId,
  loadAiProfiles,
  saveActiveProfileId,
  saveAiProfiles,
} from "@/lib/local-settings";
import type { AiProfile } from "@/types/app";

type ProfileDraft = Omit<AiProfile, "id">;

const blankProfileDraft: ProfileDraft = {
  name: "",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [editingProfileId, setEditingProfileId] = useState("");
  const [profileDraft, setProfileDraft] =
    useState<ProfileDraft>(blankProfileDraft);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];

  useEffect(() => {
    setProfiles(loadAiProfiles());
    setActiveProfileId(loadActiveProfileId());
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
    setError("");
    setNotice("");

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
    setError("");
  }

  function switchProfile(profileId: string) {
    setActiveProfileId(profileId);
    saveActiveProfileId(profileId);
    setNotice("已切换当前 AI 配置。");
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="panel h-fit rounded-lg p-5">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-[var(--teal)]" />
          <h2 className="text-2xl font-black">设置</h2>
        </div>

        <div className="mt-4 rounded-md border border-[rgba(200,84,56,0.22)] bg-[rgba(200,84,56,0.08)] p-3 text-sm font-bold text-[var(--coral)]">
          API Key 保存在浏览器 localStorage 中，仅适合个人本地使用。
        </div>

        <div className="mt-5 space-y-3">
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
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-[rgba(200,84,56,0.28)] bg-[rgba(200,84,56,0.1)] p-3 text-sm font-bold text-[var(--coral)]">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-md border border-[rgba(15,109,115,0.2)] bg-[rgba(15,109,115,0.1)] p-3 text-sm font-bold text-[var(--teal-dark)]">
            {notice}
          </div>
        ) : null}
      </div>

      <div className="panel rounded-lg p-5">
        <h2 className="text-2xl font-black">AI 配置列表</h2>
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
    </section>
  );
}
