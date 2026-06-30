# FlowState

**A focus and clarity companion that adapts to you — not the other way around.**

FlowState is a personal productivity and self-understanding app built around one idea: most tools fail because they assume consistency, willpower, and a single way of working. FlowState doesn't. It learns how you focus, how you think, and how you recover on hard days — and adjusts itself accordingly.

---

## Why FlowState

Most productivity apps are built for people who already have working systems. FlowState is built for the gap before that — task initiation, emotional regulation, sustained attention, and self-understanding. It replaces five separate apps (task manager, focus timer, journal, AI coach, brain-training tool) with one connected experience where every module shares context with the others.

---

## Core features

### Tasks — Priority-Ease Matrix
Dump messy, unstructured thoughts into a single text box. An AI engine extracts actionable tasks, estimates realistic time for each, and generates a tiny first step. You then rate each task on priority and ease, and the app orders your day using a simple rule: high priority + easy first, then high priority + hard, then low priority + hard, then low priority + easy. Momentum before difficulty.

### Focus — Adaptive Chess Engine
Instead of a static Pomodoro timer, Focus is a real chess game against a Stockfish-powered AI that reads how well you're playing in real time. Play sharp, focused chess and the engine defends properly. Play lazy or careless moves and it punishes you harder — Stockfish's skill level adjusts mid-game based on your move quality. Three time controls (10, 25, 30 minutes), live move-quality classification, and an AI-generated post-game focus report.

### ThoughtBook — Your mind, structured
A space to dump raw, unfiltered thoughts at any moment. The AI extracts a vibrant word cloud of the most meaningful words and phrases, distills the entry into one honest "crystallized thought," detects emotional tone, and surfaces the real question hiding underneath the noise. Over time, entries are grouped into auto-generated chapters with poetic, AI-written titles — turning weeks of scattered thinking into a navigable book.

### Journal — Pattern discovery, not data entry
A daily check-in (sleep, focus, mood, medication, one-liner) feeds five distinct mechanics designed to make self-tracking genuinely engaging:
- **Mood weather system** — moods rendered as weather (storm, foggy, cloudy, partly sunny, clear) instead of raw numbers
- **Weekly letter** — a short, personal AI-written letter summarizing the week in plain language
- **Correlation discoveries** — AI-surfaced patterns specific to your data ("your focus is 40% higher on 7+ hour sleep nights")
- **Streak stories** — milestone narratives instead of a plain counter
- **Peak You profile** — a living summary of the specific conditions under which you perform best

### Coach — A private, judgment-free AI companion
A chat-based coach for processing overwhelm, emotional spirals, and difficult moments. Personalized to your cognitive style, never clinical, never hollow.

---

## Design philosophy

FlowState uses a **minimal luxury** visual language — near-black surfaces, a single gold accent, and serif display type paired with clean sans body text. The goal is an interface that feels considered and calm rather than gamified and noisy.

The retention mechanics are intentional rather than manipulative by default: grace periods instead of hard streak resets, warm empty states instead of cold blank screens, variable AI-generated encouragement instead of repetitive praise, and a "bad day mode" that lowers the bar without erasing progress.

| Token | Value |
|---|---|
| Background | `#0A0A0A` |
| Card surface | `#111111` |
| Accent (gold) | `#C9A84C` |
| Text primary | `#F0EDE6` |
| Text secondary | `#7A7570` |
| Display font | Playfair Display |
| Body font | DM Sans |
| Mono font | JetBrains Mono |

---

## Architecture

```
You
 │
 ▼
FlowState client app  (React + TypeScript + Tailwind)
 │
 ├──► AI engine        Claude API (reasoning, coaching, language)
 │                     Stockfish.js (chess opponent)
 │
 └──► Supabase backend Auth · Postgres database · file storage
            ▲
            └── AI engine writes results back into the same database
```

One frontend, two backends working in parallel, one shared source of truth — every module reads and writes to the same Supabase tables, so the Coach knows what Tasks knows, and the Journal can reference Focus session data.

---

## Tech stack

- **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Supabase (Auth, Postgres, Row Level Security, Storage)
- **AI:** Anthropic Claude API for language, reasoning and personalization
- **Chess engine:** Stockfish.js (WASM, runs in a Web Worker)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Hosting:** Vercel
- **Built with:** Lovable, Claude Code

---

## Project structure

```
flowstate/
├── src/
│   ├── components/        UI components, organized by module
│   ├── pages/              Route-level screens (Dashboard, Tasks, Focus, ThoughtBook, Journal, Coach)
│   ├── hooks/               Custom hooks (useStockfish, useFocusEngine, etc.)
│   ├── lib/                  Supabase client, Claude API helpers
│   └── styles/               Design tokens and Tailwind config
├── supabase/
│   └── migrations/         Database schema and RLS policies
└── README.md
```

---

## Database schema (high level)

| Table | Purpose |
|---|---|
| `user_profile` | Name, cognitive traits, anchor time, streak count |
| `tasks` | Extracted tasks with priority, ease, and ordering |
| `focus_sessions` | Chess game records, accuracy, AI report |
| `chess_games` | Full game data, PGN, skill adaptation range |
| `thought_entries` | ThoughtBook entries, crystallized thoughts, word cloud data |
| `thought_chapters` | AI-generated chapter groupings |
| `daily_logs` | Sleep, mood, focus score, medication, notes |
| `coach_messages` | Chat history with the AI coach |

All tables use Supabase Row Level Security — every user can only access their own data.

---

## Getting started

```bash
git clone https://github.com/<your-username>/flowstate.git
cd flowstate
npm install
```

Create a `.env.local` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
```

Run the development server:

```bash
npm run dev
```

---

## Roadmap

- [ ] Mobile-native build
- [ ] Shareable ThoughtBook chapters (opt-in, private link)
- [ ] Expanded focus game library
- [ ] Calendar integration for task scheduling
- [ ] Export journal patterns as a PDF report

---

## License

This project is currently private and not licensed for redistribution.

---

Built by Aarjith — Computer Science (AI & Data Science), Easwari Engineering College.
