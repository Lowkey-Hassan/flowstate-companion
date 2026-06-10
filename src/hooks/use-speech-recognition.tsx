import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in lib.dom for all targets) */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Options = {
  /** Called with newly finalized text chunks as the user speaks. */
  onFinalChunk?: (text: string) => void;
  lang?: string;
};

export function useSpeechRecognition({ onFinalChunk, lang = "en-US" }: Options = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalChunk);
  const manualStopRef = useRef(false);

  useEffect(() => {
    onFinalRef.current = onFinalChunk;
  }, [onFinalChunk]);

  useEffect(() => {
    setSupported(getRecognitionCtor() != null);
    return () => {
      try {
        recRef.current?.abort();
      } catch {}
    };
  }, []);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    setError(null);
    manualStopRef.current = false;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const cleaned = text.trim();
          if (cleaned) onFinalRef.current?.(cleaned);
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(e.error || "error");
      setListening(false);
    };

    rec.onend = () => {
      setInterim("");
      // Auto-restart for long dictation unless the user stopped on purpose.
      if (!manualStopRef.current) {
        try {
          rec.start();
          return;
        } catch {}
      }
      setListening(false);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("error");
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
