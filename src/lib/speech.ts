type SpeechLanguage = "en-US" | "zh-CN";

type SpeechSettings = {
  rate: number;
  volume: number;
  enabled: boolean;
};

class SpeechService {
  private settings: SpeechSettings = {
    rate: 0.9,
    volume: 1,
    enabled: true,
  };

  private isPlaying = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  prime(): void {
    if (!this.isSupported()) {
      return;
    }

    window.speechSynthesis.getVoices();
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) {
      return [];
    }

    return window.speechSynthesis.getVoices();
  }

  async speakEnglish(text: string): Promise<void> {
    return this.speak(text, "en-US");
  }

  stop(): void {
    if (this.isSupported()) {
      const synthesis = window.speechSynthesis;

      if (synthesis.speaking || synthesis.pending) {
        synthesis.cancel();
      }
    }

    this.isPlaying = false;
    this.currentUtterance = null;
  }

  private async speak(text: string, language: SpeechLanguage): Promise<void> {
    if (!this.settings.enabled || !this.isSupported()) {
      throw new Error("当前浏览器不支持系统语音播放。");
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("没有可播放的英语内容。");
    }

    if (this.isPlaying || window.speechSynthesis.speaking) {
      this.stop();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(trimmedText);
      const preferredVoice = this.getVoices().find((voice) =>
        voice.lang.toLowerCase().startsWith(language.split("-")[0]),
      );

      utterance.lang = language;
      utterance.rate = this.settings.rate;
      utterance.volume = this.settings.volume;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        this.isPlaying = true;
      };
      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        resolve();
      };
      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;

        if (event.error === "interrupted" || event.error === "canceled") {
          resolve();
          return;
        }

        reject(new Error(`语音播放失败：${event.error}`));
      };

      this.currentUtterance = utterance;

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        window.setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
        return;
      }

      window.speechSynthesis.speak(utterance);
    });
  }
}

const speechService = new SpeechService();

export function primeSpeechSynthesis(): void {
  speechService.prime();
}

export function speakEnglishText(text: string): Promise<void> {
  return speechService.speakEnglish(text);
}
