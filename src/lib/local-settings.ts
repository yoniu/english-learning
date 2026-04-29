import type { AiProfile } from "@/types/app";

const AI_PROFILES_KEY = "english-learning.aiProfiles";
const ACTIVE_PROFILE_KEY = "english-learning.activeProfileId";
const SHOW_HINT_KEY = "english-learning.showTextHint";
const THEME_MODE_KEY = "english-learning.themeMode";
const THEME_COLOR_KEY = "english-learning.themeColor";
const BACKGROUND_SETTINGS_KEY = "english-learning.backgroundSettings";
const SIDEBAR_COLLAPSED_KEY = "english-learning.sidebarCollapsed";
const DEFAULT_THEME_COLOR = "#525252";

export type BackgroundSettings = {
  imageUrl: string;
  blur: number;
  scale: number;
  imageOpacity: number;
  glassBlur: number;
  glassOpacity: number;
};

export const BACKGROUND_SETTINGS_CHANGED_EVENT =
  "english-learning.backgroundSettingsChanged";

const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  imageUrl: "",
  blur: 0,
  scale: 1,
  imageOpacity: 0.16,
  glassBlur: 22,
  glassOpacity: 0.68,
};

export type ThemeMode = "system" | "light" | "dark";

function normalizeThemeColor(value: string | null): string {
  const color = value?.trim() ?? "";
  return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_THEME_COLOR;
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const value = hex.replace("#", "");
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function shadeColor(hex: string, amount: number): string {
  const { red, green, blue } = hexToRgb(hex);
  const target = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);

  return rgbToHex(
    red + (target - red) * ratio,
    green + (target - green) * ratio,
    blue + (target - blue) * ratio,
  );
}

function getContrastColor(hex: string): string {
  const { red, green, blue } = hexToRgb(hex);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#141414" : "#ffffff";
}

function clampNumber(value: unknown, min: number, max: number): number {
  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(numberValue)) {
    return min;
  }

  return Math.max(min, Math.min(max, numberValue));
}

function normalizeBackgroundSettings(value: unknown): BackgroundSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_BACKGROUND_SETTINGS;
  }

  const settings = value as Partial<BackgroundSettings>;
  return {
    imageUrl: typeof settings.imageUrl === "string" ? settings.imageUrl : "",
    blur: clampNumber(settings.blur, 0, 24),
    scale: clampNumber(settings.scale, 1, 1.4),
    imageOpacity: clampNumber(settings.imageOpacity, 0, 1),
    glassBlur: clampNumber(settings.glassBlur, 0, 36),
    glassOpacity: clampNumber(settings.glassOpacity, 0.18, 0.95),
  };
}

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
  applyThemeColor(loadThemeColor());
  applyBackgroundSettings(loadBackgroundSettings());
}

export function loadThemeColor(): string {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_COLOR;
  }

  return normalizeThemeColor(window.localStorage.getItem(THEME_COLOR_KEY));
}

export function saveThemeColor(value: string): void {
  window.localStorage.setItem(THEME_COLOR_KEY, normalizeThemeColor(value));
}

export function applyThemeColor(value: string): void {
  if (typeof document === "undefined") {
    return;
  }

  const color = normalizeThemeColor(value);
  const hoverColor = shadeColor(color, -0.18);
  const strongColor = shadeColor(color, -0.1);
  const softColor = shadeColor(color, 0.28);
  const { red, green, blue } = hexToRgb(color);
  const rgb = `${red}, ${green}, ${blue}`;
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty("--theme-color", color);
  rootStyle.setProperty("--button", color);
  rootStyle.setProperty("--button-hover", hoverColor);
  rootStyle.setProperty("--on-button", getContrastColor(color));
  rootStyle.setProperty("--accent", color);
  rootStyle.setProperty("--accent-strong", strongColor);
  rootStyle.setProperty("--teal", color);
  rootStyle.setProperty("--teal-dark", strongColor);
  rootStyle.setProperty("--mark", color);
  rootStyle.setProperty("--mark-surface", `rgba(${rgb}, 0.16)`);
  rootStyle.setProperty("--soft-mark", `rgba(${rgb}, 0.08)`);
  rootStyle.setProperty("--strong-mark", `rgba(${rgb}, 0.16)`);
  rootStyle.setProperty("--focus", `rgba(${rgb}, 0.2)`);
  rootStyle.setProperty("--theme-soft", softColor);
}

export function loadBackgroundSettings(): BackgroundSettings {
  if (typeof window === "undefined") {
    return DEFAULT_BACKGROUND_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(BACKGROUND_SETTINGS_KEY);
    return normalizeBackgroundSettings(raw ? JSON.parse(raw) : undefined);
  } catch {
    return DEFAULT_BACKGROUND_SETTINGS;
  }
}

export function saveBackgroundSettings(value: BackgroundSettings): void {
  const settings = normalizeBackgroundSettings(value);
  window.localStorage.setItem(
    BACKGROUND_SETTINGS_KEY,
    JSON.stringify(settings),
  );
  window.dispatchEvent(
    new CustomEvent(BACKGROUND_SETTINGS_CHANGED_EVENT, { detail: settings }),
  );
}

export function applyBackgroundSettings(value: BackgroundSettings): void {
  if (typeof document === "undefined") {
    return;
  }

  const settings = normalizeBackgroundSettings(value);
  const rootStyle = document.documentElement.style;
  const imageUrl = settings.imageUrl.trim();

  rootStyle.setProperty(
    "--app-background-image",
    imageUrl ? `url("${imageUrl.replace(/"/g, "%22")}")` : "none",
  );
  rootStyle.setProperty("--app-background-blur", `${settings.blur}px`);
  rootStyle.setProperty("--app-background-scale", String(settings.scale));
  rootStyle.setProperty("--app-background-opacity", String(settings.imageOpacity));
  rootStyle.setProperty("--glass-blur", `${settings.glassBlur}px`);
  rootStyle.setProperty("--glass-opacity", String(settings.glassOpacity));

  const isDark = document.documentElement.dataset.theme === "dark";
  const surfaceRgb = isDark ? "30, 30, 30" : "255, 255, 255";
  const softOpacity = Math.max(0.12, settings.glassOpacity * 0.72);
  const hoverOpacity = Math.min(0.96, settings.glassOpacity + 0.16);

  rootStyle.setProperty(
    "--surface",
    `rgba(${surfaceRgb}, ${settings.glassOpacity})`,
  );
  rootStyle.setProperty("--surface-soft", `rgba(${surfaceRgb}, ${softOpacity})`);
  rootStyle.setProperty("--surface-hover", `rgba(${surfaceRgb}, ${hoverOpacity})`);
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
