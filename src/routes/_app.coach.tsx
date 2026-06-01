import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useProfile, traitsOf } from "@/lib/profile";
import { useCoachMessages, useAddCoachMessage } from "@/lib/data";
import { useOnline } from "@/hooks/use-online";
import { coachReply } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/coach")({
  head: () => ({ meta: [{ title: "Coach — FlowState" }] }),
  component: CoachPage,
});

const PROMPTS = [
  "I'm spiralling and can't start anything.",
  "Someone's reply felt cold and I can't shake it.",
  "I have too much to do and I'm frozen.",
  "I keep abandoning things halfway.",
];

function CoachPage() {
  const profile = useProfile();
  const messages = useCoachMessages();
  const addMessage = useAddCoachMessage();
  const online = useOnline();
  const replyFn = useServerFn(coachReply);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const list = messages.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [list.length, thinking]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    if (!online) return;
    setInput("");
    await addMessage.mutateAsync({ role: "user", content });
    setThinking(true);
    try {
      const history = [
        ...list.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content },
      ];
      const res = await replyFn({
        data: {
          messages: history,
          traits: traitsOf(profile.data),
          name: profile.data?.name ?? "",
          tone: profile.data?.coach_tone ?? "gentle",
        },
      });
      const reply =
        res.text ||
        "I'm here with you. Tell me a little more about what's going on.";
      await addMessage.mutateAsync({ role: "assistant", content: reply });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col md:h-[calc(100vh-7rem)]">
      <PageTitle
        eyebrow="Coach"
        title="Talk it through."
        subtitle="A coach who gets the ADHD brain — the shame spirals, the RSD, the frozen days. No hollow affirmations."
      />

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto pb-2"
      >
        {list.length === 0 && !thinking && (
          <div className="space-y-2.5">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={!online}
                className="press w-full rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {list.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-br-sm bg-surface-2 text-foreground"
                  : "rounded-bl-sm border border-border bg-surface text-foreground",
              )}
            >
              {m.content}
            </div>
          </motion.div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-gold-dot rounded-full bg-gold"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {!online && (
          <p className="mb-2 text-center text-xs text-muted-foreground">
            You're offline. Your data is safe — the coach will be back when you
            reconnect.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            disabled={!online}
            placeholder="What's on your mind?"
            className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking || !online}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
