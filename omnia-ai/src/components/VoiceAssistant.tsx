"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { ConnectionBadge, ErrorText, Notice, PageHead, toast } from "./ui";
import { api } from "@/lib/client/api";
import { speech } from "@/lib/client/speech";
import { useI18n } from "@/lib/client/i18n";

type Turn = { role: "user" | "assistant"; text: string };

export function VoiceAssistant({ connected }: { connected: boolean }) {
  const { lang } = useI18n();
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState({ stt: true, tts: true });
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported({ stt: speech.supportsRecognition(), tts: speech.supportsSynthesis() });
    const load = () => setVoices(speech.voices());
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener?.("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    }
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, thinking]);

  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang === "ar" ? "ar" : "en"));

  const submit = async (text: string) => {
    const content = text.trim();
    if (!content) return;
    setThinking(true);
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text: content }]);
    try {
      let id = conversationId;
      if (!id) {
        const created = await api<{ id: string }>("/api/conversations", { body: { title: "Voice session", mode: "auto" } });
        id = created.id;
        setConversationId(id);
      }
      const res = await api<{ assistantMessage: { content: string; provider: string; model: string } }>(`/api/conversations/${id}/messages`, {
        body: { content, mode: "auto", attachmentIds: [] },
      });
      const reply = res.assistantMessage.content;
      setTurns((prev) => [...prev, { role: "assistant", text: reply }]);
      if (autoSpeak && supported.tts) {
        setSpeaking(true);
        speech.speak(reply, lang === "ar" || /[؀-ۿ]/.test(reply) ? "ar-SA" : "en-US", () => setSpeaking(false));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Voice request failed.";
      setError(message);
      toast(message, "error");
    } finally {
      setThinking(false);
    }
  };

  const toggle = () => {
    if (!supported.stt) return toast("Speech recognition is not supported in this browser. Try Chrome, Edge or Safari.", "error");
    if (listening) {
      speech.stopListening();
      setListening(false);
      return;
    }
    // Interruption: the user starts talking, so stop any spoken reply immediately.
    speech.cancel();
    setSpeaking(false);
    setListening(true);
    speech.listen(
      lang === "ar" ? "ar-SA" : "en-US",
      (finalText, interimText) => {
        setInterim(interimText);
        if (finalText) {
          setInterim("");
          setListening(false);
          speech.stopListening();
          submit(finalText);
        }
      },
      () => {
        setListening(false);
        setInterim("");
      },
    );
  };

  const stopSpeaking = () => {
    speech.cancel();
    setSpeaking(false);
  };

  return (
    <div>
      <PageHead
        title="Voice Assistant"
        subtitle="Speak naturally. OMNIA transcribes your voice in your browser, answers through your connected model, and reads the reply aloud. Speak again at any time to interrupt."
        actions={<ConnectionBadge connected={connected} label={connected ? "AI connected" : "No AI provider"} />}
      />
      {(!supported.stt || !supported.tts) && (
        <div style={{ marginBottom: 16 }}>
          <Notice kind="warning" title="Voice features are partly unavailable">
            {!supported.stt && "Speech recognition needs Chrome, Edge or Safari. "}
            {!supported.tts && "Speech synthesis is not available in this browser."}
          </Notice>
        </div>
      )}
      <div className="studio" style={{ gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)" }}>
        <div className="card stack" style={{ alignItems: "center", textAlign: "center" }}>
          <button
            className={`voice-orb ${listening ? "live" : ""}`}
            onClick={toggle}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Start speaking"}
            disabled={!connected || thinking}
          >
            <Icon name="mic" size={56} />
          </button>
          <div className="wave" aria-hidden="true" style={{ opacity: listening || speaking ? 1 : 0.25 }}>
            {Array.from({ length: 9 }).map((_, i) => (<span key={i} />))}
          </div>
          <div className="small muted" style={{ minHeight: 20 }}>
            {listening ? (interim || "Listening…") : thinking ? "Thinking…" : speaking ? "Speaking — tap the orb to interrupt" : "Tap to speak"}
          </div>
          {speaking && (
            <button className="btn btn-sm" onClick={stopSpeaking}><Icon name="stop" size={13} />Stop speaking</button>
          )}
          <div className="divider" style={{ width: "100%" }} />
          <label className="field" style={{ width: "100%", textAlign: "start" }}>
            Voice
            <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)} disabled={!langVoices.length}>
              <option value="">{langVoices.length ? "Default for language" : "No voices installed for this language"}</option>
              {langVoices.map((v) => (<option key={v.name} value={v.name}>{v.name} ({v.lang})</option>))}
            </select>
          </label>
          <label className="row" style={{ justifyContent: "space-between", width: "100%" }}>
            <span className="small dim">Speak replies aloud</span>
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#9f9f9f" }} />
          </label>
        </div>

        <div className="card stack" style={{ minHeight: 420 }}>
          <div className="row-between">
            <strong>Transcript</strong>
            {turns.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setTurns([]); setConversationId(null); }}>New session</button>
            )}
          </div>
          <ErrorText message={error} />
          {turns.length === 0 && (
            <p className="muted" style={{ margin: "auto", textAlign: "center", maxWidth: "40ch" }}>
              Try: “Summarize the three biggest risks of launching a food delivery app in Saudi Arabia.”
            </p>
          )}
          <div className="stack" style={{ gap: 14, overflowY: "auto", maxHeight: 520 }}>
            {turns.map((t, i) => (
              <div key={i} className={`msg msg-${t.role}`}>
                <div className="bubble">
                  {t.role === "user" ? <div>{t.text}</div> : <div className="md"><p style={{ whiteSpace: "pre-wrap" }}>{t.text}</p></div>}
                </div>
              </div>
            ))}
            {thinking && <div className="msg msg-assistant"><div className="bubble"><span className="typing"><span /><span /><span /></span></div></div>}
            <div ref={bottom} />
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const value = (form.elements.namedItem("typed") as HTMLInputElement).value;
              form.reset();
              submit(value);
            }}
          >
            <input name="typed" placeholder="Or type a message…" maxLength={4000} aria-label="Type a message" disabled={!connected || thinking} />
            <button className="btn btn-primary" type="submit" disabled={!connected || thinking}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
