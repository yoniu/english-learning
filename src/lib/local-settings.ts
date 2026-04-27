import type { AiProfile } from "@/types/app";

const AI_PROFILES_KEY = "english-learning.aiProfiles";
const ACTIVE_PROFILE_KEY = "english-learning.activeProfileId";
const SHOW_HINT_KEY = "english-learning.showTextHint";
const THEME_MODE_KEY = "english-learning.themeMode";
const SIDEBAR_COLLAPSED_KEY = "english-learning.sidebarCollapsed";

export type ThemeMode = "system" | "light" | "dark";

export function loadAiProfiles(): AiProfile[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AI_PROFILES_KEY);
    const profiles = raw ? (JSON.parse(raw) as AiProfile[]) : [];
    return Array.isArray(profiles) ? profiles : [];
  } catch {
    return [];
  }
}

export function saveAiProfiles(profiles: AiProfile[]): void {
  window.localStorage.setItem(AI_PROFILES_KEY, JSON.stringify(profiles));
}

export function loadActiveProfileId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ACTIVE_PROFILE_KEY) ?? "";
}

export function saveActiveProfileId(profileId: string): void {
  window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function loadShowTextHint(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SHOW_HINT_KEY) === "true";
}

export function saveShowTextHint(value: boolean): void {
  window.localStorage.setItem(SHOW_HINT_KEY, String(value));
}

export function loadThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const value = window.localStorage.getItem(THEME_MODE_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function saveThemeMode(value: ThemeMode): void {
  window.localStorage.setItem(THEME_MODE_KEY, value);
}

export function resolveThemeMode(value: ThemeMode): "light" | "dark" {
  if (value !== "system") {
    return value;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyThemeMode(value: ThemeMode): void {
  document.documentElement.dataset.themeMode = value;
  document.documentElement.dataset.theme = resolveThemeMode(value);
}

export function loadSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function saveSidebarCollapsed(value: boolean): void {
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
}
