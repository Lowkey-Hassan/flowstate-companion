import { Home, Zap, CheckSquare, MessageCircle, Repeat, BookOpen, NotebookPen } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/focus", label: "Focus", icon: Zap, exact: false },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, exact: false },
  { to: "/thoughtbook", label: "ThoughtBook", icon: NotebookPen, exact: false },
  { to: "/coach", label: "Coach", icon: MessageCircle, exact: false },
  { to: "/habits", label: "Habits", icon: Repeat, exact: false },
  { to: "/journal", label: "Journal", icon: BookOpen, exact: false },
] as const;

export const ADHD_TRAITS = [
  "Task paralysis",
  "Emotional floods",
  "Time blindness",
  "Hyperfocus tunnels",
  "Forgetting everything",
  "Starting but not finishing",
  "Rejection sensitivity (RSD)",
  "Morning chaos",
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
