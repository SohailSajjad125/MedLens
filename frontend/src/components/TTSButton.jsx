import { useState, useEffect } from "react";
import { SoundIcon } from "./Icons";

export default function TTSButton({ text, lang = "en" }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      setSupported(true);
    }
  }, []);

  const speak = () => {
    if (!supported) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ur" ? "ur-PK" : "en-US";
    
    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!supported) return null;

  return (
    <button
      className={`btn ${speaking ? "btn-primary" : "btn-ghost"}`}
      onClick={speak}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", fontSize: "0.82rem" }}
      title={speaking ? "Stop Read Aloud" : "Read Aloud"}
    >
      <SoundIcon width={14} height={14} />
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
