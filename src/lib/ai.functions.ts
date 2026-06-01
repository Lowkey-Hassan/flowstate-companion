import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callAI(
  messages: ChatMsg[],
  opts?: { tools?: unknown[]; tool_choice?: unknown },
) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, ...(opts ?? {}) }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("CREDITS");
    const t = await res.text();
    console.error("AI gateway error:", res.status, t);
    throw new Error("AI_ERROR");
  }
  return res.json();
}

function textOf(data: any): string {
  return data?.choices?.[0]?.message?.content?.trim() ?? "";
}

function toolArgsOf(data: any): any {
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) return null;
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    return null;
  }
}

/* ---------------- Dashboard greeting ---------------- */
export const getGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { partOfDay: string; traits: string[] }) => d)
  .handler(async ({ data }) => {
    try {
      const traits = data.traits?.length ? data.traits.join(", ") : "general ADHD";
      const out = await callAI([
        {
          role: "user",
          content: `Give a single warm, non-cheesy, ADHD-aware motivational sentence for someone starting their ${data.partOfDay}. Their ADHD traits are: ${traits}. Max 18 words. No emojis. Return only the sentence.`,
        },
      ]);
      return { text: textOf(out) };
    } catch (e: any) {
      return { text: "", error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Task breakdown ---------------- */
export const breakdownTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brainDump: string; traits: string[] }) =>
    z.object({ brainDump: z.string().min(1).max(4000), traits: z.array(z.string()).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const traits = data.traits?.length ? data.traits.join(", ") : "general ADHD";
      const out = await callAI(
        [
          {
            role: "system",
            content: `You are an ADHD coach. The user has brain-dumped text. Extract all actionable tasks. For each task provide: title (max 8 words), estimated time in minutes (realistic for ADHD — add 40% buffer), energy required (low/medium/high), and one micro-first-step (the single tiniest action to start, max 10 words). User's ADHD traits: ${traits}.`,
          },
          { role: "user", content: data.brainDump },
        ],
        {
          tools: [
            {
              type: "function",
              function: {
                name: "return_tasks",
                description: "Return extracted ADHD-friendly tasks.",
                parameters: {
                  type: "object",
                  properties: {
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          time_estimate_mins: { type: "number" },
                          energy_level: { type: "string", enum: ["low", "medium", "high"] },
                          micro_first_step: { type: "string" },
                        },
                        required: ["title", "time_estimate_mins", "energy_level", "micro_first_step"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["tasks"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_tasks" } },
        },
      );
      const parsed = toolArgsOf(out);
      return { tasks: parsed?.tasks ?? [] };
    } catch (e: any) {
      return { tasks: [], error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Coach reply ---------------- */
export const coachReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      messages: { role: "user" | "assistant"; content: string }[];
      traits: string[];
      name: string;
      tone: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const traits = data.traits?.length ? data.traits.join(", ") : "general ADHD";
      const toneMod =
        data.tone === "direct"
          ? "Lean direct and pragmatic."
          : data.tone === "tough"
            ? "Use warm tough-love: loving but firm, push them gently toward action."
            : "Lean gentle and soothing.";
      const sys = `You are an expert ADHD coach and emotional support companion. The user has ADHD with these traits: ${traits}. Your role:
1. Help them process emotional dysregulation, especially RSD (Rejection Sensitive Dysphoria).
2. Offer CBT and DBT-based reframing when appropriate.
3. Help break spirals of shame, overwhelm, and task paralysis.
4. Be warm, direct, never condescending.
5. Keep responses concise (under 100 words unless they need more).
6. Never use hollow affirmations like "That's valid!" — be genuinely human.
7. If the user seems in crisis, gently suggest professional support.
8. Remember context within the conversation.
${toneMod}
User's name: ${data.name || "friend"}.`;
      const out = await callAI([
        { role: "system", content: sys },
        ...data.messages.slice(-16).map((m) => ({ role: m.role, content: m.content })),
      ]);
      return { text: textOf(out) };
    } catch (e: any) {
      return { text: "", error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Build routine ---------------- */
export const buildRoutine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { type: string; traits: string[]; anchorTime: string }) => d)
  .handler(async ({ data }) => {
    try {
      const traits = data.traits?.length ? data.traits.join(", ") : "general ADHD";
      const out = await callAI(
        [
          {
            role: "system",
            content: `Create an ADHD-friendly ${data.type} routine for someone with traits: ${traits}. Anchor time: ${data.anchorTime || "flexible"}. Realistic for ADHD brains: short steps, built-in transitions, no more than 8 items. For each habit include: name, duration in minutes (realistic), and a 'minimum viable version' for bad days (drastically shortened fallback).`,
          },
          { role: "user", content: `Build my ${data.type} routine.` },
        ],
        {
          tools: [
            {
              type: "function",
              function: {
                name: "return_routine",
                description: "Return an ADHD-friendly routine.",
                parameters: {
                  type: "object",
                  properties: {
                    habits: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          duration_mins: { type: "number" },
                          mvp_fallback: { type: "string" },
                        },
                        required: ["name", "duration_mins", "mvp_fallback"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["habits"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_routine" } },
        },
      );
      const parsed = toolArgsOf(out);
      return { habits: parsed?.habits ?? [] };
    } catch (e: any) {
      return { habits: [], error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Journal insights ---------------- */
export const journalInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { logs: unknown[] }) => d)
  .handler(async ({ data }) => {
    try {
      const out = await callAI([
        {
          role: "system",
          content:
            "Analyze these ADHD symptom logs. Identify 2-3 actionable patterns (e.g. 'Your focus is consistently lower on days with under 6h sleep'). Be specific, warm, data-driven. Max 3 points, max 20 words each. Return only bullet points, one per line, each starting with '- '.",
        },
        { role: "user", content: JSON.stringify(data.logs).slice(0, 4000) },
      ]);
      const points = textOf(out)
        .split("\n")
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      return { points };
    } catch (e: any) {
      return { points: [], error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Focus encouragement ---------------- */
export const focusEncouragement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { weeklyCount: number; rating: string }) => d)
  .handler(async ({ data }) => {
    try {
      const out = await callAI([
        {
          role: "user",
          content: `Someone just finished a focus session rated "${data.rating}". It's their ${data.weeklyCount} focus session this week. Give one short warm encouraging sentence, under 16 words, no emojis. Return only the sentence.`,
        },
      ]);
      return { text: textOf(out) };
    } catch (e: any) {
      return { text: "", error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Weekly review ---------------- */
export const weeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { focusMinutes: number; tasks: number; habitPct: number; streak: number }) => d)
  .handler(async ({ data }) => {
    try {
      const out = await callAI([
        {
          role: "user",
          content: `Write one warm reflective sentence about this person's week. They had ${data.focusMinutes} focus minutes, completed ${data.tasks} tasks, ${data.habitPct}% habit completion, ${data.streak}-day streak. Under 22 words. No emojis. Return only the sentence.`,
        },
      ]);
      return { text: textOf(out) };
    } catch (e: any) {
      return { text: "", error: e?.message ?? "AI_ERROR" };
    }
  });
