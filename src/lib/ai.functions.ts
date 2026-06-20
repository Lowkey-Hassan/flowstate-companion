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
      const traits = data.traits?.length ? data.traits.join(", ") : "no specifics shared";
      const out = await callAI([
        {
          role: "user",
          content: `Give a single warm, grounded, human sentence for someone starting their ${data.partOfDay}. Their cognitive style: ${traits}. Make it specific to the time of day. Max 18 words. No clichés. No emojis. Return only the sentence.`,
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
      const traits = data.traits?.length ? data.traits.join(", ") : "no specifics shared";
      const out = await callAI(
        [
          {
            role: "system",
            content: `You are a focus coach. The user has brain-dumped text. Extract all actionable tasks. For each task provide: title (max 8 words), estimated time in minutes (realistic — add a 40% buffer), energy required (low/medium/high), and one micro-first-step (the single tiniest action to start, max 10 words). The user's cognitive style: ${traits}.`,
          },
          { role: "user", content: data.brainDump },
        ],
        {
          tools: [
            {
              type: "function",
              function: {
                name: "return_tasks",
                description: "Return extracted manageable tasks.",
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

/* ---------------- Task extraction (Priority×Ease flow) ---------------- */
export const extractTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brainDump: string }) =>
    z.object({ brainDump: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const out = await callAI(
        [
          {
            role: "system",
            content: `You are a focus coach. The user has brain-dumped some text. Extract every distinct actionable task. For each task provide: a short title (max 8 words, action verb first), a realistic time estimate in minutes (add a 40% buffer, be honest), and the single smallest possible first action (max 10 words).`,
          },
          { role: "user", content: data.brainDump },
        ],
        {
          tools: [
            {
              type: "function",
              function: {
                name: "return_tasks",
                description: "Return extracted manageable tasks.",
                parameters: {
                  type: "object",
                  properties: {
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          estimatedMinutes: { type: "number" },
                          microStep: { type: "string" },
                        },
                        required: ["title", "estimatedMinutes", "microStep"],
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
      const tasks = (parsed?.tasks ?? []).map((t: any, i: number) => ({
        id: `task_${i + 1}`,
        title: String(t.title ?? "").slice(0, 120),
        estimatedMinutes: Math.max(1, Math.round(Number(t.estimatedMinutes) || 15)),
        microStep: String(t.microStep ?? "").slice(0, 120),
      }));
      return { tasks };
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
      const traits = data.traits?.length ? data.traits.join(", ") : "not specified";
      const toneMod =
        data.tone === "direct"
          ? "Lean direct and pragmatic."
          : data.tone === "tough"
            ? "Use warm tough-love: loving but firm, push them gently toward action."
            : "Lean gentle and soothing.";
      const sys = `You are a warm, perceptive focus coach and emotional support companion. The user has described their cognitive style as: ${traits}. Use this to personalize your responses, but never label or diagnose. Your role:
1. Help them process difficult emotions, intense reactions, and mental overwhelm.
2. Offer CBT and DBT-based reframing when appropriate.
3. Help break spirals of shame, overwhelm, and feeling stuck.
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

/* ---------------- Journal: weekly letter ---------------- */
export const weeklyLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { logs: unknown[]; name?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const out = await callAI([
        {
          role: "system",
          content: `You are writing a brief, warm, personal letter to the user summarizing their week based on their self-reported data. Write in second person ("You"). Be specific — cite actual numbers. Be like a perceptive friend who noticed something real, not a wellness app spitting generic encouragement. No bullet points. No headers. Just 3-4 flowing sentences. Max 80 words. Tone: warm, honest, slightly literary.`,
        },
        {
          role: "user",
          content: `Data for the week:\n${JSON.stringify(data.logs).slice(0, 4000)}\nUser name: ${data.name || "friend"}`,
        },
      ]);
      return { text: textOf(out) };
    } catch (e: any) {
      return { text: "", error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Journal: correlation discoveries ---------------- */
export const correlationDiscoveries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { logs: unknown[] }) => d)
  .handler(async ({ data }) => {
    try {
      const out = await callAI([
        {
          role: "system",
          content: `You are a pattern analyst reviewing someone's self-reported daily logs. Find 2-3 specific, interesting correlations in the data. Each should feel like a genuine discovery — something the user might not have noticed themselves. Format each as: {"discovery": "short punchy headline max 8 words", "detail": "one sentence explanation with specific numbers from the data, max 25 words"}. Return ONLY a valid JSON array. No markdown.`,
        },
        { role: "user", content: JSON.stringify(data.logs).slice(0, 5000) },
      ]);
      const raw = textOf(out).replace(/```json|```/g, "").trim();
      let items: { discovery: string; detail: string }[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed
            .map((d: any) => ({
              discovery: String(d?.discovery ?? "").slice(0, 80),
              detail: String(d?.detail ?? "").slice(0, 200),
            }))
            .filter((d) => d.discovery)
            .slice(0, 3);
        }
      } catch {
        /* ignore parse errors */
      }
      return { items };
    } catch (e: any) {
      return { items: [], error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Journal: peak self profile ---------------- */
export const peakProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { logs: unknown[] }) => d)
  .handler(async ({ data }) => {
    try {
      const out = await callAI([
        {
          role: "system",
          content: `Based on the user's log data, write a 3-line "peak conditions" profile. This describes the specific conditions under which this person performs at their best. Format: 3 short sentences. Each starts with "You focus best when..." or "Your sharpest days follow..." etc. Be hyper-specific — cite time ranges, sleep hours, patterns from the data. Max 15 words per line. Return as a JSON array of 3 strings.`,
        },
        { role: "user", content: JSON.stringify(data.logs).slice(0, 6000) },
      ]);
      const raw = textOf(out).replace(/```json|```/g, "").trim();
      let lines: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          lines = parsed.map((l: any) => String(l).slice(0, 120)).filter(Boolean).slice(0, 3);
        }
      } catch {
        /* ignore */
      }
      return { lines };
    } catch (e: any) {
      return { lines: [], error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- Chess: post-game report ---------------- */
export const chessReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      result: string;
      endCondition: string;
      totalMoves: number;
      accuracy: number;
      blunders: number;
      mistakes: number;
      inaccuracies: number;
      brilliant: number;
      difficultyLabel: string;
      minSkill: number;
      maxSkill: number;
      durationSeconds: number;
      timeControlMinutes: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const mins = Math.floor(data.durationSeconds / 60);
      const secs = data.durationSeconds % 60;
      const out = await callAI([
        {
          role: "system",
          content: `You are a chess coach reviewing a game. Write a 3-sentence game review. Sentence 1: The game's defining moment. Sentence 2: One clear observation about the player's style or decision-making in this game. Sentence 3: One specific thing to focus on next game. Be direct, knowledgeable, and human. No generic advice. Max 80 words total.`,
        },
        {
          role: "user",
          content: `Game data:
- Result: ${data.result}
- How it ended: ${data.endCondition}
- Total moves: ${data.totalMoves}
- Player accuracy: ${data.accuracy}%
- Blunders: ${data.blunders}, Mistakes: ${data.mistakes}, Inaccuracies: ${data.inaccuracies}
- Brilliant moves: ${data.brilliant}
- AI difficulty: ${data.difficultyLabel}
- AI skill range during game: ${data.minSkill} to ${data.maxSkill}
- Game duration: ${mins}m ${secs}s
- Time control: ${data.timeControlMinutes} minutes`,
        },
      ]);
      return { text: textOf(out) };
    } catch (e: any) {
      return { text: "", error: e?.message ?? "AI_ERROR" };
    }
  });

/* ---------------- ThoughtBook: analyze a thought ---------------- */
const WORD_CATEGORIES = [
  "core_theme",
  "emotion",
  "desire",
  "conflict",
  "external",
  "question",
  "context",
] as const;

export const analyzeThought = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { thought: string; name?: string; traits?: string[] }) =>
    z
      .object({
        thought: z.string().min(1).max(8000),
        name: z.string().max(120).optional(),
        traits: z.array(z.string()).max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const thought = data.thought;
    const userName = data.name || "the user";
    const userTraits = data.traits?.length ? data.traits.join(", ") : "not specified";

    const cloudCall = callAI(
      [
        {
          role: "system",
          content: `You are a thought analysis engine. Analyze the user's raw thought dump and extract the most semantically meaningful words and short phrases (2-3 word max). Do NOT extract common words (I, the, and, is, was, etc.). For each word/phrase return: word (the word or short phrase), importance (1-10, where 10 = most central to the thought's meaning, not just frequency), category (one of: core_theme, emotion, desire, conflict, external, question, context). Max 18 words/phrases. Prioritize quality over quantity.`,
        },
        { role: "user", content: thought },
      ],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "return_word_cloud",
              description: "Return the analyzed word cloud.",
              parameters: {
                type: "object",
                properties: {
                  words: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        word: { type: "string" },
                        importance: { type: "number" },
                        category: { type: "string", enum: [...WORD_CATEGORIES] },
                      },
                      required: ["word", "importance", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["words"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_word_cloud" } },
      },
    );

    const breakdownCall = callAI(
      [
        {
          role: "system",
          content: `You are a deeply perceptive thought coach. The user has brain-dumped a raw, unfiltered thought. Understand it at multiple levels. Return:
- crystallized: One single sentence (max 25 words) that captures the real, honest core of this thought — the thing the user is actually feeling but couldn't say directly. It should feel like a revelation, not a summary.
- tones: 2-4 emotional tones detected, lowercase, max 2 words each.
- breakdown: 3-4 interpretation bullets — what the user is actually saying beneath the surface. Max 20 words each. Only include a 4th if genuinely distinct.
- hiddenQuestion: The single most important unresolved question embedded in this thought, phrased exactly as the user might ask themselves at 2am. Max 15 words.
User name: ${userName}. The user's cognitive style: ${userTraits}.`,
        },
        { role: "user", content: thought },
      ],
      {
        tools: [
          {
            type: "function",
            function: {
              name: "return_breakdown",
              description: "Return the deep breakdown of the thought.",
              parameters: {
                type: "object",
                properties: {
                  crystallized: { type: "string" },
                  tones: { type: "array", items: { type: "string" } },
                  breakdown: { type: "array", items: { type: "string" } },
                  hiddenQuestion: { type: "string" },
                },
                required: ["crystallized", "tones", "breakdown", "hiddenQuestion"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_breakdown" } },
      },
    );

    try {
      const [cloudOut, breakdownOut] = await Promise.all([cloudCall, breakdownCall]);
      const cloud = toolArgsOf(cloudOut);
      const bd = toolArgsOf(breakdownOut);

      const wordCloudData = (cloud?.words ?? [])
        .slice(0, 18)
        .map((w: any) => ({
          word: String(w.word ?? "").slice(0, 60),
          importance: Math.min(10, Math.max(1, Math.round(Number(w.importance) || 5))),
          category: WORD_CATEGORIES.includes(w.category) ? w.category : "context",
        }))
        .filter((w: any) => w.word);

      const tones = (bd?.tones ?? [])
        .slice(0, 4)
        .map((t: any) => String(t).toLowerCase().slice(0, 30))
        .filter(Boolean);
      const breakdown = (bd?.breakdown ?? [])
        .slice(0, 4)
        .map((b: any) => String(b).slice(0, 200))
        .filter(Boolean);

      return {
        crystallized: String(bd?.crystallized ?? "").slice(0, 400),
        tones,
        breakdown,
        hiddenQuestion: String(bd?.hiddenQuestion ?? "").slice(0, 200),
        wordCloudData,
      };
    } catch (e: any) {
      return {
        crystallized: "",
        tones: [],
        breakdown: [],
        hiddenQuestion: "",
        wordCloudData: [],
        error: e?.message ?? "AI_ERROR",
      };
    }
  });

/* ---------------- ThoughtBook: detect chapters ---------------- */
export const detectChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { entries: { id: string; crystallized: string; tones: string[] }[] }) =>
      z
        .object({
          entries: z
            .array(
              z.object({
                id: z.string(),
                crystallized: z.string(),
                tones: z.array(z.string()),
              }),
            )
            .min(1)
            .max(200),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const summaries = data.entries.map((e) => ({
        id: e.id,
        crystallized: e.crystallized,
        tones: e.tones,
      }));
      const out = await callAI(
        [
          {
            role: "system",
            content: `You are a thoughtful literary analyst reading someone's private thought journal. Analyze the following thought entries (their crystallized thoughts and emotional tones) and group them into 2-5 thematic chapters. For each chapter: name (a short, poetic, evocative title, 3-6 words — not clinical, not generic; good: "The question of staying", "Learning to trust my own noise"; bad: "Career Concerns", "Self-doubt"); theme (one sentence describing the common thread, max 20 words); entryIds (array of entry IDs that belong to this chapter). Each entry belongs to only ONE chapter (pick its dominant theme). If an entry doesn't fit any theme, put it in a default chapter called "Loose thoughts".`,
          },
          { role: "user", content: JSON.stringify(summaries).slice(0, 8000) },
        ],
        {
          tools: [
            {
              type: "function",
              function: {
                name: "return_chapters",
                description: "Return the detected chapters.",
                parameters: {
                  type: "object",
                  properties: {
                    chapters: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          theme: { type: "string" },
                          entryIds: { type: "array", items: { type: "string" } },
                        },
                        required: ["name", "theme", "entryIds"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["chapters"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_chapters" } },
        },
      );
      const parsed = toolArgsOf(out);
      const chapters = (parsed?.chapters ?? []).map((c: any) => ({
        name: String(c.name ?? "Loose thoughts").slice(0, 120),
        theme: String(c.theme ?? "").slice(0, 240),
        entryIds: Array.isArray(c.entryIds) ? c.entryIds.map((id: any) => String(id)) : [],
      }));
      return { chapters };
    } catch (e: any) {
      return { chapters: [], error: e?.message ?? "AI_ERROR" };
    }
  });
