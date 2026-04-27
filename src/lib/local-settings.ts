import type { AiProfile } from "@/types/app";

const AI_PROFILES_KEY = "english-learning.aiProfiles";
const ACTIVE_PROFILE_KEY = "english-learning.activeProfileId";
const SHOW_HINT_KEY = "english-learning.showTextHint";

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
