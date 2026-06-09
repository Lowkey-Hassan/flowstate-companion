import type { CloudWord, ThoughtEntry } from "@/lib/data";
import { wordCloudOf } from "@/lib/data";

/* ---------------- Category colors ---------------- */
export const CATEGORY_COLORS: Record<string, string> = {
  core_theme: "#C9A84C",
  emotion: "#5DCAA5",
  desire: "#AFA9EC",
  conflict: "#E24B4A",
  external: "#F0997B",
  question: "#85B7EB",
  context: "#7A7570",
};

export const CATEGORY_LABELS: Record<string, string> = {
  core_theme: "Core theme",
  emotion: "Emotion",
  desire: "Desire",
  conflict: "Conflict",
  external: "External",
  question: "Question",
  context: "Context",
};

export function categoryToColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.context;
}

/* ---------------- Importance → font size ---------------- */
export function importanceToFontSize(importance: number, scale = 1): number {
  // Maps 1-10 to ~11-32px with an exponential curve.
  return Math.round((11 + (importance - 1) * (importance - 1) * 0.22) * scale);
}

/* ---------------- Tone colors ---------------- */
const TONE_RULES: { match: RegExp; color: string }[] = [
  { match: /fear|anxiety|scared|afraid|panic/, color: "#E24B4A" },
  { match: /guilt|shame/, color: "#F0997B" },
  { match: /sad|grief|loss|lonely|hurt/, color: "#85B7EB" },
  { match: /hope|optimis|grateful/, color: "#5DCAA5" },
  { match: /anger|angry|frustrat|rage/, color: "#E24B4A" },
  { match: /doubt|uncertain|unsure|confus|lost/, color: "#C9A84C" },
  { match: /excit|ambiti|eager|driven|desire/, color: "#AFA9EC" },
];

export function toneColor(tone: string): string {
  const t = tone.toLowerCase();
  for (const rule of TONE_RULES) if (rule.match.test(t)) return rule.color;
  return "#C9A84C";
}

/* ---------------- Master cloud ---------------- */
export type MasterWord = {
  word: string;
  masterImportance: number;
  appearanceCount: number;
  dominantCategory: string;
};

function dominant(categories: Map<string, number>): string {
  let best = "context";
  let max = -1;
  categories.forEach((count, cat) => {
    if (count > max) {
      max = count;
      best = cat;
    }
  });
  return best;
}

export function buildMasterCloud(entries: ThoughtEntry[]): MasterWord[] {
  const wordMap = new Map<
    string,
    { totalImportance: number; count: number; categories: Map<string, number> }
  >();

  entries.forEach((entry) => {
    wordCloudOf(entry).forEach((word: CloudWord) => {
      const key = word.word.toLowerCase();
      const existing =
        wordMap.get(key) ?? {
          totalImportance: 0,
          count: 0,
          categories: new Map<string, number>(),
        };
      existing.totalImportance += word.importance;
      existing.count += 1;
      existing.categories.set(
        word.category,
        (existing.categories.get(word.category) ?? 0) + 1,
      );
      wordMap.set(key, existing);
    });
  });

  return Array.from(wordMap.entries())
    .map(([word, data]) => ({
      word,
      masterImportance: Math.min(
        10,
        data.totalImportance / data.count + data.count * 0.8,
      ),
      appearanceCount: data.count,
      dominantCategory: dominant(data.categories),
    }))
    .sort((a, b) => b.masterImportance - a.masterImportance)
    .slice(0, 30);
}

/* ---------------- Formatting ---------------- */
export function formatEntryTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", " ");
  return `${date} · ${time}`;
}

export function formatNowTime(d = new Date()): string {
  const day = d.toLocaleDateString("en-US", { weekday: "long" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

export function romanNumeral(n: number): string {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let num = n;
  for (const [val, sym] of map) {
    while (num >= val) {
      out += sym;
      num -= val;
    }
  }
  return out || "I";
}

export function truncate(text: string, n: number): string {
  if (text.length <= n) return text;
  return text.slice(0, n).trimEnd() + "…";
}
