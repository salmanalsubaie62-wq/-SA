"use client";

/** Browser speech: SpeechRecognition (speech-to-text) and speechSynthesis (text-to-speech). */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

let active: Recognition | null = null;

export const speech = {
  supportsRecognition: () => recognitionCtor() !== null,
  supportsSynthesis: () => typeof window !== "undefined" && "speechSynthesis" in window,

  listen(lang: string, onText: (finalText: string, interimText: string) => void, onEnd: () => void) {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    this.stopListening();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      onText(finalText.trim(), interimText.trim());
    };
    rec.onend = () => {
      if (active === rec) active = null;
      onEnd();
    };
    rec.onerror = () => {
      if (active === rec) active = null;
      onEnd();
    };
    active = rec;
    rec.start();
  },

  stopListening() {
    if (active) {
      const rec = active;
      active = null;
      try { rec.stop(); } catch { /* already stopped */ }
    }
  },

  /** Interrupts spoken output so the user can speak (conversation interruption). */
  speakCancelIfAny() {
    if (this.supportsSynthesis()) window.speechSynthesis.cancel();
  },

  speak(text: string, lang: string, onEnd?: () => void, rate = 1): boolean {
    if (!this.supportsSynthesis()) return false;
    const synth = window.speechSynthesis;
    synth.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, " code omitted ").replace(/[`*#>_\[\]()]/g, " ").slice(0, 4000);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = lang;
    utter.rate = rate;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (voice) utter.voice = voice;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    synth.speak(utter);
    return true;
  },

  cancel() {
    if (this.supportsSynthesis()) window.speechSynthesis.cancel();
  },

  voices(): SpeechSynthesisVoice[] {
    return this.supportsSynthesis() ? window.speechSynthesis.getVoices() : [];
  },
};
