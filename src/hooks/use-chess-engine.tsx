import { useEffect, useRef, useCallback } from "react";

type Pending = {
  resolve: (value: any) => void;
  type: "bestmove" | "eval";
};

export function useChessEngine() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef<Map<number, Pending>>(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/chess-engine.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e: MessageEvent) => {
      const { id, type, move, score } = e.data ?? {};
      const p = pending.current.get(id);
      if (!p) return;
      pending.current.delete(id);
      if (type === "bestmove") p.resolve(move ?? "");
      else if (type === "eval") p.resolve(typeof score === "number" ? score : 0);
      else p.resolve(null);
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.current.clear();
    };
  }, []);

  const getBestMove = useCallback(
    (fen: string, skill: number): Promise<string> =>
      new Promise((resolve) => {
        const w = workerRef.current;
        if (!w) return resolve("");
        const id = ++idRef.current;
        pending.current.set(id, { resolve, type: "bestmove" });
        w.postMessage({ type: "bestmove", id, fen, skill });
      }),
    [],
  );

  const evaluatePosition = useCallback(
    (fen: string): Promise<number> =>
      new Promise((resolve) => {
        const w = workerRef.current;
        if (!w) return resolve(0);
        const id = ++idRef.current;
        pending.current.set(id, { resolve, type: "eval" });
        w.postMessage({ type: "eval", id, fen });
      }),
    [],
  );

  return { getBestMove, evaluatePosition };
}
