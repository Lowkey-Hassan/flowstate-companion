/// <reference lib="webworker" />
// Self-contained adaptive chess engine (minimax + alpha-beta) running in a Web Worker.
// Avoids shipping a ~40MB Stockfish NNUE blob while still providing adaptive strength,
// best-move search, and position evaluation for move classification.
import { Chess, type Move } from "chess.js";

type Color = "w" | "b";

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (white perspective, a8..h1 not needed — chess.js gives us squares).
// Simplified central-control tables.
const PST: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30,
    20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5,
    -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0,
    0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
    0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20,
    20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20,
    -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0,
    5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10,
    0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20,
    -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0,
    -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0,
    0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
    5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5,
    5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
    -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
    -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
    -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20,
    -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function squareIndex(square: string): number {
  const file = square.charCodeAt(0) - 97; // a=0
  const rank = 8 - parseInt(square[1], 10); // rank 8 -> row 0
  return rank * 8 + file;
}

// Static evaluation from White's perspective (centipawns).
function evaluateBoard(game: Chess): number {
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const idx = r * 8 + f;
      const base = PIECE_VALUE[piece.type];
      const tableW = PST[piece.type][idx];
      const tableB = PST[piece.type][(7 - r) * 8 + f];
      if (piece.color === "w") score += base + tableW;
      else score -= base + tableB;
    }
  }
  return score;
}

function negamax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  color: number,
): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return -100000 * color * color; // handled below
    return color * evaluateBoard(game);
  }
  let best = -Infinity;
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) {
    if (game.isCheck()) return -99000; // checkmated side to move
    return 0; // stalemate
  }
  // Order: captures first
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
  for (const m of moves) {
    game.move(m);
    const val = -negamax(game, depth - 1, -beta, -alpha, -color);
    game.undo();
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// skill 0-20 → search depth + blunder behavior
function depthForSkill(skill: number): number {
  if (skill <= 3) return 1;
  if (skill <= 8) return 2;
  if (skill <= 14) return 3;
  return 3;
}

function getBestMove(fen: string, skill: number): string {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return "";
  const color = game.turn() === "w" ? 1 : -1;
  const depth = depthForSkill(skill);

  const scored = moves.map((m) => {
    game.move(m);
    const val = -negamax(game, depth - 1, -Infinity, Infinity, -color);
    game.undo();
    return { move: m, val };
  });
  scored.sort((a, b) => b.val - a.val);

  // Weaker skill levels intentionally pick suboptimal moves.
  // skill 20 → always best; lower skill → wider random window + blunder chance.
  const blunderChance = Math.max(0, (12 - skill) / 18); // ~0.66 at skill0, 0 at skill12+
  if (Math.random() < blunderChance && scored.length > 2) {
    const window = Math.min(
      scored.length,
      Math.max(2, Math.round((20 - skill) / 3)),
    );
    const pick = scored[Math.floor(Math.random() * window)];
    return uci(pick.move);
  }

  // Among near-best moves (within a margin scaled by skill) pick randomly.
  const margin = Math.max(0, (20 - skill) * 8);
  const top = scored.filter((s) => s.val >= scored[0].val - margin);
  const chosen = top[Math.floor(Math.random() * top.length)];
  return uci(chosen.move);
}

function uci(m: Move): string {
  return `${m.from}${m.to}${m.promotion ?? ""}`;
}

// Evaluation from White's perspective for move classification.
function evaluatePosition(fen: string): number {
  const game = new Chess(fen);
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -99000 : 99000;
  }
  if (game.isDraw() || game.isStalemate()) return 0;
  // shallow search for stability
  const color = game.turn() === "w" ? 1 : -1;
  const val = negamax(game, 2, -Infinity, Infinity, color);
  return color * val;
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  try {
    if (msg.type === "bestmove") {
      const move = getBestMove(msg.fen, msg.skill);
      (self as any).postMessage({ type: "bestmove", id: msg.id, move });
    } else if (msg.type === "eval") {
      const score = evaluatePosition(msg.fen);
      (self as any).postMessage({ type: "eval", id: msg.id, score });
    }
  } catch (err) {
    (self as any).postMessage({ type: "error", id: msg.id, error: String(err) });
  }
};
