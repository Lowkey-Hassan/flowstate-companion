import { Home, Puzzle, CheckSquare, MessageCircle, BookOpen, NotebookPen } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/focus", label: "Chess", icon: Puzzle, exact: false },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, exact: false },
  { to: "/coach", label: "Coach", icon: MessageCircle, exact: false },
  { to: "/thoughtbook", label: "ThoughtBook", icon: NotebookPen, exact: false },
  { to: "/journal", label: "Journal", icon: BookOpen, exact: false },
] as const;

// Universal, identity-neutral self-description traits.
export const MIND_TRAITS = [
  "Getting started is hard",
  "Emotions hit hard and fast",
  "Time slips away without noticing",
  "Deep focus on one thing for hours",
  "Forgetting things mid-task",
  "Starting things but not finishing",
  "Overthinking what others think",
  "Mornings feel like a battle",
  "Racing thoughts at night",
  "Too many tabs open mentally",
] as const;

export const ANCHOR_TIMES = [
  { id: "morning", label: "Morning", hint: "Start the day with intention" },
  { id: "midday", label: "Midday", hint: "A mid-day reset and refocus" },
  { id: "evening", label: "Evening", hint: "Wind down and reflect" },
] as const;

export const REWARD_MESSAGES = [
  "You just did the thing your brain said was impossible.",
  "That's one more rep of showing up.",
  "Whatever came before this moment — this was a win.",
  "Momentum doesn't need motivation. You proved that.",
  "Future you is quietly grateful right now.",
  "Starting was the hard part. You already cleared it.",
  "That focus was real. Nobody can take it back.",
  "Small block, big signal: you're someone who follows through.",
  "Your brain fought you and you finished anyway.",
  "This is what trust in yourself is built from.",
  "One session at a time is exactly how it's done.",
  "You chose the work over the spiral. That counts twice.",
] as const;

export const MOOD_OPTIONS = [
  { score: 1, label: "Overwhelmed", color: "#C25050" },
  { score: 2, label: "Scattered", color: "#E8A84C" },
  { score: 3, label: "Okay", color: "#D9C77A" },
  { score: 4, label: "Focused", color: "#4CAF7D" },
  { score: 5, label: "In Flow", color: "#C9A84C" },
] as const;

export const SLEEP_OPTIONS = ["<5h", "5–6h", "6–7h", "7–8h", "8h+"] as const;

export function partOfDay(d = new Date()): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function randomReward() {
  return REWARD_MESSAGES[Math.floor(Math.random() * REWARD_MESSAGES.length)];
}

/* ---------------- Mood → Weather (Journal) ---------------- */
import type { LucideIcon } from "lucide-react";
import {
  CloudLightning,
  CloudFog,
  Cloud,
  Sun,
  SunMedium,
} from "lucide-react";

export type Weather = {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
};

export const MOOD_TO_WEATHER: Record<number, Weather> = {
  1: { label: "Storm", icon: CloudLightning, color: "#E24B4A", bg: "#A32D2D11" },
  2: { label: "Foggy", icon: CloudFog, color: "#8A6E2F", bg: "#C9A84C11" },
  3: { label: "Cloudy", icon: Cloud, color: "#7A7570", bg: "#25252511" },
  4: { label: "Partly sunny", icon: Sun, color: "#5DCAA5", bg: "#1D9E7511" },
  5: { label: "Clear", icon: SunMedium, color: "#C9A84C", bg: "#C9A84C22" },
};

/* ---------------- Streak Stories (Journal) ---------------- */
export function streakStory(days: number): string {
  if (days <= 0) return "Today is day zero. The only day that ever matters is the next one.";
  if (days <= 2) return "Two days in. The first days are always the hardest to start.";
  if (days === 3) return "Three days. You've officially broken the 'I'll start tomorrow' loop.";
  if (days < 7) return `${days} days. Still early, still real. The pattern is forming.`;
  if (days === 7) return "One full week. Whatever shifted — it's working.";
  if (days < 14) return `${days} days. A week behind you, momentum quietly building.`;
  if (days === 14) return "Two weeks. That's not motivation anymore — that's a system.";
  if (days < 21) return `${days} days. You're past the point where most people drift off.`;
  if (days === 21) return "21 days. The research says habits form around now. You already know that's not really true. You kept going anyway.";
  if (days < 30) return `${days} days. Closing in on a month of showing up for yourself.`;
  if (days === 30) return "A month. Look at that number. Look at what you built.";
  return `${days} days. This is just who you are now.`;
}

/* ---------------- Chess move quality ---------------- */
export type MoveQuality =
  | "brilliant"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export const MOVE_QUALITY_DISPLAY: Record<
  MoveQuality,
  { label: string; color: string; icon: string }
> = {
  brilliant: { label: "!! Brilliant", color: "#5DCAA5", icon: "✦" },
  good: { label: "! Good", color: "#C9A84C", icon: "●" },
  inaccuracy: { label: "?! Inaccuracy", color: "#E8A84C", icon: "△" },
  mistake: { label: "? Mistake", color: "#F0997B", icon: "▲" },
  blunder: { label: "?? Blunder", color: "#E24B4A", icon: "✕" },
};

export const CHESS_DIFFICULTIES = [
  { label: "Beginner", subtitle: "Makes mistakes", skill: 2 },
  { label: "Club Player", subtitle: "Plays solid chess", skill: 8 },
  { label: "Advanced", subtitle: "Rarely blunders", skill: 14 },
  { label: "Master", subtitle: "Near-perfect play", skill: 20 },
] as const;

export const CHESS_TIME_CONTROLS = [
  { minutes: 10, subtitle: "Rapid" },
  { minutes: 25, subtitle: "Semi-classical" },
  { minutes: 30, subtitle: "Classical" },
] as const;
