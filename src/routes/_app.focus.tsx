import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RefreshCw, Flag, Handshake } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useChessEngine } from "@/hooks/use-chess-engine";
import { useChessGames, useAddChessGame } from "@/lib/data";
import { chessReport } from "@/lib/ai.functions";
import {
  CHESS_DIFFICULTIES,
  CHESS_TIME_CONTROLS,
  MOVE_QUALITY_DISPLAY,
  type MoveQuality,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/focus")({
  head: () => ({ meta: [{ title: "Chess — FlowState" }] }),
  component: ChessPage,
});

type Phase = "setup" | "game";
type GameResult = "win" | "loss" | "draw";
type EndCondition =
  | "checkmate"
  | "timeout"
  | "resign"
  | "stalemate"
  | "draw_offer"
  | "insufficient_material"
  | "repetition"
  | "fifty_move";

const DARK = "#3D3229";
const LIGHT = "#C9A84C";

function classify(cpLoss: number): MoveQuality {
  if (cpLoss < 10) return "brilliant";
  if (cpLoss < 30) return "good";
  if (cpLoss < 100) return "inaccuracy";
  if (cpLoss < 300) return "mistake";
  return "blunder";
}

function aiThinkTime(tc: number, moveNumber: number): number {
  const base = ({ 10: 800, 25: 1500, 30: 2000 } as Record<number, number>)[tc] ?? 1000;
  const mid = moveNumber > 10 && moveNumber < 35 ? 1.3 : 1.0;
  const jitter = (Math.random() - 0.5) * 400;
  return Math.round(base * mid + jitter);
}

function aiStatusMessage(
  consecBlunders: number,
  consecGood: number,
  last: MoveQuality | null,
): string {
  if (consecBlunders >= 2) {
    return [
      "Sensing weakness. Hunting harder.",
      "You've given me an opening. Taking it.",
      "The position is mine now.",
      "No mercy from here.",
    ][Math.floor(Math.random() * 4)];
  }
  if (consecGood >= 3) {
    return [
      "You're making this difficult.",
      "Solid. I need to be careful.",
      "Respect. Playing my best now.",
      "A worthy opponent.",
    ][Math.floor(Math.random() * 4)];
  }
  if (last === "blunder") return "That was a gift. I won't waste it.";
  if (last === "brilliant") return "Strong move. Reconsidering...";
  return ["Thinking...", "Calculating...", "Evaluating the position...", "Considering options..."][
    Math.floor(Math.random() * 4)
  ];
}

const PIECE_UNICODE: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
};

function fmtClock(ms: number): { text: string; low: boolean } {
  if (ms < 0) ms = 0;
  if (ms >= 60000) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { text: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, low: false };
  }
  const s = (ms / 1000).toFixed(1);
  return { text: `${s}`, low: true };
}

function ChessPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [difficultyIdx, setDifficultyIdx] = useState<number | null>(1);
  const [tcIdx, setTcIdx] = useState<number>(0);

  const recent = useChessGames(5);

  if (phase === "setup") {
    return (
      <SetupScreen
        difficultyIdx={difficultyIdx}
        setDifficultyIdx={setDifficultyIdx}
        tcIdx={tcIdx}
        setTcIdx={setTcIdx}
        recent={recent.data ?? []}
        onStart={() => setPhase("game")}
      />
    );
  }

  return (
    <GameScreen
      mounted={mounted}
      baseSkill={CHESS_DIFFICULTIES[difficultyIdx ?? 1].skill}
      difficultyLabel={CHESS_DIFFICULTIES[difficultyIdx ?? 1].label}
      timeControl={CHESS_TIME_CONTROLS[tcIdx].minutes}
      onExit={() => setPhase("setup")}
    />
  );
}

/* ---------------- Setup ---------------- */
function SetupScreen({
  difficultyIdx,
  setDifficultyIdx,
  tcIdx,
  setTcIdx,
  recent,
  onStart,
}: {
  difficultyIdx: number | null;
  setDifficultyIdx: (n: number) => void;
  tcIdx: number;
  setTcIdx: (n: number) => void;
  recent: { id: string; result: string; difficulty_label: string; total_moves: number; created_at: string }[];
  onStart: () => void;
}) {
  return (
    <div>
      <PageTitle eyebrow="Chess" title="Every move is a decision." />

      <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        Select difficulty
      </p>
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHESS_DIFFICULTIES.map((d, i) => (
          <button
            key={d.label}
            onClick={() => setDifficultyIdx(i)}
            className={cn(
              "press rounded-[10px] border px-4 py-3.5 text-left transition-colors",
              difficultyIdx === i
                ? "border-gold bg-[#1A1500]"
                : "border-border bg-surface hover:border-border-accent",
            )}
          >
            <div className="text-sm text-foreground">{d.label}</div>
            <div className="text-xs text-muted-foreground">{d.subtitle}</div>
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        Select time control
      </p>
      <div className="mb-7 grid grid-cols-3 gap-3">
        {CHESS_TIME_CONTROLS.map((t, i) => (
          <button
            key={t.minutes}
            onClick={() => setTcIdx(i)}
            className={cn(
              "press rounded-[10px] border px-4 py-3.5 text-center transition-colors",
              tcIdx === i
                ? "border-gold bg-[#1A1500]"
                : "border-border bg-surface hover:border-border-accent",
            )}
          >
            <div className="text-sm text-foreground">{t.minutes} min</div>
            <div className="text-xs text-muted-foreground">{t.subtitle}</div>
          </button>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={difficultyIdx === null}
        className="press mb-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Start Game →
      </button>

      {recent.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Recent games
          </p>
          <div className="space-y-1.5">
            {recent.map((g) => {
              const dot =
                g.result === "win" ? "#5DCAA5" : g.result === "loss" ? "#E24B4A" : "#7A7570";
              const label = g.result === "win" ? "Win" : g.result === "loss" ? "Loss" : "Draw";
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-[13px] text-[#D4C8B8]"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
                  <span className="w-10 shrink-0">{label}</span>
                  <span className="text-muted-foreground">vs {g.difficulty_label}</span>
                  <span className="text-muted-foreground">· {g.total_moves} moves</span>
                  <span className="ml-auto text-muted-foreground">
                    {new Date(g.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Game ---------------- */
function GameScreen({
  mounted,
  baseSkill,
  difficultyLabel,
  timeControl,
  onExit,
}: {
  mounted: boolean;
  baseSkill: number;
  difficultyLabel: string;
  timeControl: number;
  onExit: () => void;
}) {
  const engine = useChessEngine();
  const addGame = useAddChessGame();
  const reportFn = useServerFn(chessReport);

  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: string; to: string } | null>(null);

  const [userMs, setUserMs] = useState(timeControl * 60000);
  const [aiMs, setAiMs] = useState(timeControl * 60000);
  const [activeClock, setActiveClock] = useState<"user" | "ai" | null>("user");

  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [qualityPill, setQualityPill] = useState<MoveQuality | null>(null);
  const [aiStatus, setAiStatus] = useState("Your move.");
  const [thinking, setThinking] = useState(false);

  // adaptive engine state
  const adaptive = useRef({
    base: baseSkill,
    current: baseSkill,
    consecBlunders: 0,
    consecGood: 0,
    minSkill: baseSkill,
    maxSkill: baseSkill,
  });

  // stats
  const stats = useRef({
    blunders: 0,
    mistakes: 0,
    inaccuracies: 0,
    good: 0,
    brilliant: 0,
    cpLossSum: 0,
    userMoves: 0,
  });

  const startTime = useRef(Date.now());
  const [gameOver, setGameOver] = useState<{
    result: GameResult;
    end: EndCondition;
    headline: string;
  } | null>(null);
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const savedRef = useRef(false);

  const historyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight });
  }, [moveHistory.length]);

  /* ---- clock tick ---- */
  useEffect(() => {
    if (!activeClock || gameOver) return;
    const t = setInterval(() => {
      if (activeClock === "user") {
        setUserMs((m) => {
          if (m <= 100) {
            clearInterval(t);
            finishGame("loss", "timeout");
            return 0;
          }
          return m - 100;
        });
      } else {
        setAiMs((m) => {
          if (m <= 100) {
            clearInterval(t);
            finishGame("win", "timeout");
            return 0;
          }
          return m - 100;
        });
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClock, gameOver]);

  const captured = useMemo(() => {
    // material captured by each side, derived from current board
    const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const whiteRemaining: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const blackRemaining: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const row of gameRef.current.board()) {
      for (const cell of row) {
        if (!cell || cell.type === "k") continue;
        if (cell.color === "w") whiteRemaining[cell.type]++;
        else blackRemaining[cell.type]++;
      }
    }
    const userCaptured: string[] = []; // black pieces user took
    const aiCaptured: string[] = []; // white pieces ai took
    (["q", "r", "b", "n", "p"] as const).forEach((t) => {
      for (let i = 0; i < start[t] - blackRemaining[t]; i++) userCaptured.push(PIECE_UNICODE[t]);
      for (let i = 0; i < start[t] - whiteRemaining[t]; i++) aiCaptured.push(PIECE_UNICODE[t]);
    });
    const vals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let userAdv = 0;
    (["q", "r", "b", "n", "p"] as const).forEach((t) => {
      userAdv += (start[t] - blackRemaining[t]) * vals[t];
      userAdv -= (start[t] - whiteRemaining[t]) * vals[t];
    });
    return { userCaptured, aiCaptured, userAdv };
  }, [fen]);

  const checkGameEnd = useCallback((): { result: GameResult; end: EndCondition; headline: string } | null => {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      // side to move is checkmated; if it's black's turn AI(black) lost → user win
      const userWon = g.turn() === "b";
      return {
        result: userWon ? "win" : "loss",
        end: "checkmate",
        headline: "Checkmate",
      };
    }
    if (g.isStalemate()) return { result: "draw", end: "stalemate", headline: "Stalemate" };
    if (g.isInsufficientMaterial())
      return { result: "draw", end: "insufficient_material", headline: "Draw" };
    if (g.isThreefoldRepetition()) return { result: "draw", end: "repetition", headline: "Draw" };
    if (g.isDraw()) return { result: "draw", end: "fifty_move", headline: "Draw" };
    return null;
  }, []);

  const finishGame = useCallback(
    async (result: GameResult, end: EndCondition, headline?: string) => {
      if (savedRef.current) return;
      savedRef.current = true;
      setActiveClock(null);
      setThinking(false);
      const head =
        headline ??
        (end === "checkmate"
          ? "Checkmate"
          : end === "timeout"
            ? "Time's up"
            : end === "resign"
              ? "Resigned"
              : "Game over");
      setGameOver({ result, end, headline: head });

      const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
      const s = stats.current;
      const accuracy =
        s.userMoves > 0
          ? Math.max(0, Math.min(100, Math.round(100 - s.cpLossSum / s.userMoves / 6)))
          : 100;

      // AI report (streamed)
      setReportLoading(true);
      try {
        const res = await reportFn({
          data: {
            result,
            endCondition: end,
            totalMoves: Math.ceil(moveHistory.length / 2),
            accuracy,
            blunders: s.blunders,
            mistakes: s.mistakes,
            inaccuracies: s.inaccuracies,
            brilliant: s.brilliant,
            difficultyLabel,
            minSkill: adaptive.current.minSkill,
            maxSkill: adaptive.current.maxSkill,
            durationSeconds,
            timeControlMinutes: timeControl,
          },
        });
        const full = res.text || "";
        // stream word by word
        const words = full.split(" ");
        let acc = "";
        for (let i = 0; i < words.length; i++) {
          acc += (i ? " " : "") + words[i];
          setReport(acc);
          await new Promise((r) => setTimeout(r, 20));
        }
        addGame.mutate({
          result,
          end_condition: end,
          difficulty_label: difficultyLabel,
          base_skill_level: adaptive.current.base,
          min_skill_reached: adaptive.current.minSkill,
          max_skill_reached: adaptive.current.maxSkill,
          time_control_minutes: timeControl,
          total_moves: Math.ceil(moveHistory.length / 2),
          duration_seconds: durationSeconds,
          accuracy_percent: accuracy,
          blunders: s.blunders,
          mistakes: s.mistakes,
          inaccuracies: s.inaccuracies,
          good_moves: s.good,
          brilliant_moves: s.brilliant,
          pgn: gameRef.current.pgn(),
          ai_report: full,
        });
      } catch {
        /* graceful */
      } finally {
        setReportLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moveHistory.length, difficultyLabel, timeControl],
  );

  const makeAiMove = useCallback(async () => {
    const g = gameRef.current;
    if (g.isGameOver()) return;
    setThinking(true);
    setAiStatus(aiStatusMessage(adaptive.current.consecBlunders, adaptive.current.consecGood, qualityPill));
    const think = aiThinkTime(timeControl, g.moveNumber());
    const [move] = await Promise.all([
      engine.getBestMove(g.fen(), adaptive.current.current),
      new Promise((r) => setTimeout(r, think)),
    ]);
    if (!move || g.isGameOver()) {
      setThinking(false);
      return;
    }
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    const promo = move.slice(4, 5) || undefined;
    try {
      g.move({ from, to, promotion: promo as any });
    } catch {
      setThinking(false);
      return;
    }
    setFen(g.fen());
    setLastMove({ from, to });
    setMoveHistory(g.history());
    setThinking(false);
    const end = checkGameEnd();
    if (end) {
      finishGame(end.result, end.end, end.headline);
    } else {
      setActiveClock("user");
      setAiStatus("Your move.");
    }
  }, [engine, timeControl, checkGameEnd, finishGame, qualityPill]);

  const afterUserMove = useCallback(
    async (fenBefore: string) => {
      const g = gameRef.current;
      setFen(g.fen());
      setMoveHistory(g.history());
      setSelected(null);

      // classify
      const fenAfter = g.fen();
      const [evalBefore, evalAfter] = await Promise.all([
        engine.evaluatePosition(fenBefore),
        engine.evaluatePosition(fenAfter),
      ]);
      const cpLoss = Math.max(0, evalBefore - evalAfter); // white perspective; user is white
      const quality = classify(cpLoss);
      const s = stats.current;
      s.userMoves++;
      s.cpLossSum += cpLoss;
      if (quality === "blunder") s.blunders++;
      else if (quality === "mistake") s.mistakes++;
      else if (quality === "inaccuracy") s.inaccuracies++;
      else if (quality === "good") s.good++;
      else s.brilliant++;

      // adapt
      const a = adaptive.current;
      if (quality === "blunder" || quality === "mistake") {
        a.consecBlunders++;
        a.consecGood = 0;
        if (a.consecBlunders >= 2) a.current = Math.min(20, a.current + 3);
      } else if (quality === "brilliant" || quality === "good") {
        a.consecBlunders = 0;
        a.consecGood++;
        if (a.consecGood >= 3) a.current = a.base;
      } else {
        a.consecBlunders = Math.max(0, a.consecBlunders - 1);
        a.consecGood = Math.max(0, a.consecGood - 1);
        a.current = Math.round((a.current + a.base) / 2);
      }
      const minL = Math.max(0, a.base - 2);
      const maxL = Math.min(20, a.base + 8);
      a.current = Math.max(minL, Math.min(maxL, a.current));
      a.minSkill = Math.min(a.minSkill, a.current);
      a.maxSkill = Math.max(a.maxSkill, a.current);

      setQualityPill(quality);
      setTimeout(() => setQualityPill(null), 2500);

      const end = checkGameEnd();
      if (end) {
        finishGame(end.result, end.end, end.headline);
        return;
      }
      setActiveClock("ai");
      void makeAiMove();
    },
    [engine, checkGameEnd, finishGame, makeAiMove],
  );

  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      const g = gameRef.current;
      if (gameOver || g.turn() !== "w") return false;
      // promotion?
      const piece = g.get(from as Square);
      const isPromo =
        piece?.type === "p" && (to[1] === "8" || to[1] === "1") && piece.color === "w";
      const legal = g.moves({ square: from as Square, verbose: true }).some((m) => m.to === to);
      if (!legal) return false;
      if (isPromo) {
        setPendingPromo({ from, to });
        return false;
      }
      const fenBefore = g.fen();
      try {
        g.move({ from, to });
      } catch {
        return false;
      }
      setLastMove({ from, to });
      void afterUserMove(fenBefore);
      return true;
    },
    [gameOver, afterUserMove],
  );

  const applyPromotion = (piece: "q" | "r" | "b" | "n") => {
    if (!pendingPromo) return;
    const g = gameRef.current;
    const fenBefore = g.fen();
    try {
      g.move({ from: pendingPromo.from, to: pendingPromo.to, promotion: piece });
    } catch {
      setPendingPromo(null);
      return;
    }
    setLastMove({ from: pendingPromo.from, to: pendingPromo.to });
    setPendingPromo(null);
    void afterUserMove(fenBefore);
  };

  // auto-queen if no promo choice within 8s
  useEffect(() => {
    if (!pendingPromo) return;
    const t = setTimeout(() => applyPromotion("q"), 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPromo]);

  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const g = gameRef.current;
      if (gameOver || g.turn() !== "w") return;
      if (selected) {
        if (square === selected) {
          setSelected(null);
          return;
        }
        const moved = tryMove(selected, square);
        if (!moved) {
          const p = g.get(square as Square);
          setSelected(p && p.color === "w" ? square : null);
        }
      } else {
        const p = g.get(square as Square);
        if (p && p.color === "w") setSelected(square);
      }
    },
    [selected, tryMove, gameOver],
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(201, 168, 76, 0.25)" };
      styles[lastMove.to] = { backgroundColor: "rgba(201, 168, 76, 0.25)" };
    }
    if (selected) {
      styles[selected] = { backgroundColor: "rgba(201, 168, 76, 0.5)" };
      for (const m of gameRef.current.moves({ square: selected as Square, verbose: true })) {
        styles[m.to] = {
          background:
            "radial-gradient(circle, rgba(201,168,76,0.45) 25%, transparent 26%)",
        };
      }
    }
    if (gameRef.current.inCheck()) {
      const turn = gameRef.current.turn();
      for (const row of gameRef.current.board()) {
        for (const cell of row) {
          if (cell && cell.type === "k" && cell.color === turn) {
            styles[cell.square] = { backgroundColor: "rgba(226, 75, 74, 0.6)" };
          }
        }
      }
    }
    return styles;
  }, [lastMove, selected, fen]);

  const userClock = fmtClock(userMs);
  const aiClock = fmtClock(aiMs);

  const offerDraw = async () => {
    const evalNow = await engine.evaluatePosition(gameRef.current.fen());
    // eval white perspective; AI is black so AI advantage = -evalNow
    const aiAdv = -evalNow;
    if (aiAdv > 150) {
      setAiStatus("Draw declined. I'm pressing my advantage.");
      return;
    }
    finishGame("draw", "draw_offer", "Draw agreed");
  };

  return (
    <div>
      {/* top controls */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="press flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          New Game
        </button>
        <div className="hidden text-xs text-muted-foreground sm:block">
          {timeControl} min · {difficultyLabel}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={offerDraw}
            disabled={!!gameOver}
            className="press flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Handshake className="h-3.5 w-3.5" />
            Draw
          </button>
          <button
            onClick={() => finishGame("loss", "resign", "You resigned")}
            disabled={!!gameOver}
            className="press flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
          >
            <Flag className="h-3.5 w-3.5" />
            Resign
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        {/* board column */}
        <div>
          <ClockBar
            label={`AI · ${difficultyLabel}`}
            time={aiClock.text}
            low={aiClock.low}
            active={activeClock === "ai"}
          />
          {captured.aiCaptured.length > 0 && (
            <div className="my-1.5 text-base text-muted-foreground">
              {captured.aiCaptured.join(" ")}
              {captured.userAdv < 0 && (
                <span className="ml-2 text-xs text-gold">+{-captured.userAdv}</span>
              )}
            </div>
          )}

          <div className="relative mx-auto my-2 w-full max-w-[480px]">
            {mounted && (
              <Chessboard
                options={{
                  position: fen,
                  onPieceDrop: ({ sourceSquare, targetSquare }) =>
                    targetSquare ? tryMove(sourceSquare, targetSquare) : false,
                  onSquareClick,
                  boardOrientation: orientation,
                  allowDragging: !gameOver && gameRef.current.turn() === "w",
                  darkSquareStyle: { backgroundColor: DARK },
                  lightSquareStyle: { backgroundColor: LIGHT },
                  boardStyle: { borderRadius: "8px", border: "2px solid #1F1E1C" },
                  squareStyles,
                  id: "flowstate-board",
                }}
              />
            )}

            {/* move quality pill */}
            <AnimatePresence>
              {qualityPill && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-2 top-2 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: MOVE_QUALITY_DISPLAY[qualityPill].color + "22",
                    border: `1px solid ${MOVE_QUALITY_DISPLAY[qualityPill].color}44`,
                    color: MOVE_QUALITY_DISPLAY[qualityPill].color,
                  }}
                >
                  {MOVE_QUALITY_DISPLAY[qualityPill].icon}{" "}
                  {MOVE_QUALITY_DISPLAY[qualityPill].label}
                </motion.div>
              )}
            </AnimatePresence>

            {/* promotion modal */}
            <AnimatePresence>
              {pendingPromo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm"
                >
                  <div className="rounded-xl border border-gold/40 bg-[#111111] p-5 text-center">
                    <p className="mb-3 font-display text-lg text-foreground">Promote your pawn</p>
                    <div className="flex gap-2">
                      {(["q", "r", "b", "n"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => applyPromotion(p)}
                          className="press flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface text-2xl text-foreground transition-colors hover:border-gold"
                        >
                          {PIECE_UNICODE[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {captured.userCaptured.length > 0 && (
            <div className="my-1.5 text-base text-muted-foreground">
              {captured.userCaptured.join(" ")}
              {captured.userAdv > 0 && (
                <span className="ml-2 text-xs text-gold">+{captured.userAdv}</span>
              )}
            </div>
          )}
          <ClockBar label="You" time={userClock.text} low={userClock.low} active={activeClock === "user"} />

          <button
            onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
            className="press mx-auto mt-3 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Flip board
          </button>
        </div>

        {/* right panel */}
        <div className="space-y-4">
          <div className="card-surface p-4">
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              AI Status
            </p>
            <p className="font-display text-sm italic text-gold">{aiStatus}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Skill: {adaptive.current.current}/20{" "}
              {adaptive.current.current > adaptive.current.base ? (
                <span className="text-[#5DCAA5]">(↑ Adapting)</span>
              ) : adaptive.current.current < adaptive.current.base ? (
                <span>(↓ Easing)</span>
              ) : (
                <span>(Steady)</span>
              )}
            </p>
            {thinking && (
              <span className="mt-2 inline-block h-2 w-2 animate-gold-dot rounded-full bg-gold" />
            )}
          </div>

          <div className="card-surface p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Moves
            </p>
            <div ref={historyRef} className="max-h-[280px] space-y-0.5 overflow-y-auto pr-1">
              {moveHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No moves yet.</p>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                  <div key={i} className="flex gap-3 rounded px-1 py-0.5 text-[13px]">
                    <span className="w-6 shrink-0 font-mono text-xs text-[#3D3A37]">{i + 1}.</span>
                    <span className="w-16 text-[#D4C8B8]">{moveHistory[i * 2]}</span>
                    <span className="text-[#7A7570]">{moveHistory[i * 2 + 1] ?? ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* game over modal */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl border border-border bg-[#111111] p-7 text-center"
            >
              <h2 className="font-display text-3xl text-foreground">{gameOver.headline}</h2>
              <p
                className="mt-1 text-base"
                style={{
                  color:
                    gameOver.result === "win"
                      ? "#C9A84C"
                      : gameOver.result === "loss"
                        ? "#E24B4A"
                        : "#7A7570",
                }}
              >
                {gameOver.result === "win"
                  ? "You won."
                  : gameOver.result === "loss"
                    ? "You lost."
                    : "It's a draw."}
              </p>

              <div className="mt-5 flex justify-center gap-5 text-xs text-muted-foreground">
                <span>Moves: {Math.ceil(moveHistory.length / 2)}</span>
                <span>Blunders: {stats.current.blunders}</span>
                <span>Brilliant: {stats.current.brilliant}</span>
              </div>

              <div className="mt-5 rounded-lg border border-gold/30 bg-[#1A1500] p-4 text-left">
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-gold">
                  Game Review
                </p>
                {reportLoading && !report ? (
                  <span className="inline-block h-2 w-2 animate-gold-dot rounded-full bg-gold" />
                ) : (
                  <p className="text-sm italic leading-relaxed text-[#F0EDE6]">
                    {report || "No review available."}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={onExit}
                  className="press rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClockBar({
  label,
  time,
  low,
  active,
}: {
  label: string;
  time: string;
  low: boolean;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border bg-[#111111] px-4 py-2",
        active ? "border-gold border-l-[3px] border-l-gold" : "border-border",
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="font-mono text-2xl tabular-nums"
        style={{ color: low ? "#E24B4A" : "#F0EDE6" }}
      >
        {time}
      </span>
    </div>
  );
}
