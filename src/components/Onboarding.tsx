import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { MIND_TRAITS, ANCHOR_TIMES } from "@/lib/constants";
import { useUpdateProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

const TONES = [
  { id: "gentle", label: "Gentle", hint: "Soft, soothing, never pushy." },
  { id: "direct", label: "Direct", hint: "Clear and pragmatic. No fluff." },
  { id: "tough", label: "Tough love", hint: "Warm but firm. Push me." },
];

export function Onboarding() {
  const update = useUpdateProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string>("morning");
  const [tone, setTone] = useState("gentle");

  const toggleTrait = (t: string) =>
    setTraits((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const finish = () => {
    update.mutate({
      name: name.trim() || null,
      mind_traits: traits,
      anchor_time: anchor,
      coach_tone: tone,
      onboarding_complete: true,
    });
  };

  const steps = [
    // 0 — welcome / name
    <div key="name" className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          Let's make this yours.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This is your private space. No feeds, no likes, no judgement. First —
          what should I call you?
        </p>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gold/60"
      />
    </div>,

    // 1 — traits
    <div key="traits" className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          How does your mind usually work?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick everything that resonates. No wrong answers.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {MIND_TRAITS.map((t) => {
          const on = traits.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleTrait(t)}
              className={cn(
                "press flex items-center justify-between rounded-lg border px-3.5 py-3 text-left text-sm transition-colors",
                on
                  ? "border-gold/60 bg-surface-2 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-accent",
              )}
            >
              <span>{t}</span>
              {on && <Check className="h-4 w-4 shrink-0 text-gold" />}
            </button>
          );
        })}
      </div>
    </div>,

    // 2 — anchor
    <div key="anchor" className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          When do you want your anchor?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One gentle moment each day to check in. We'll build your ritual around
          it.
        </p>
      </div>
      <div className="space-y-2.5">
        {ANCHOR_TIMES.map((a) => {
          const on = anchor === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAnchor(a.id)}
              className={cn(
                "press flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-colors",
                on
                  ? "border-gold/60 bg-surface-2"
                  : "border-border bg-surface hover:border-border-accent",
              )}
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {a.label}
                </div>
                <div className="text-xs text-muted-foreground">{a.hint}</div>
              </div>
              {on && <Check className="h-4 w-4 shrink-0 text-gold" />}
            </button>
          );
        })}
      </div>
    </div>,

    // 3 — tone
    <div key="tone" className="space-y-6">
      <div>
        <h2 className="font-display text-3xl tracking-tight text-foreground">
          How should your coach talk to you?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You can change this any time.
        </p>
      </div>
      <div className="space-y-2.5">
        {TONES.map((t) => {
          const on = tone === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={cn(
                "press flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-colors",
                on
                  ? "border-gold/60 bg-surface-2"
                  : "border-border bg-surface hover:border-border-accent",
              )}
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t.label}
                </div>
                <div className="text-xs text-muted-foreground">{t.hint}</div>
              </div>
              {on && <Check className="h-4 w-4 shrink-0 text-gold" />}
            </button>
          );
        })}
      </div>
    </div>,
  ];

  const isLast = step === steps.length - 1;
  const canNext = step === 0 ? true : step === 1 ? traits.length > 0 : true;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[55vh] w-[55vh] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--gold) 20%, transparent), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md">
        {/* progress */}
        <div className="mb-10 flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-gold" : "bg-border-accent",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={cn(
              "text-sm text-muted-foreground transition-colors hover:text-foreground",
              step === 0 && "pointer-events-none opacity-0",
            )}
          >
            Back
          </button>
          <button
            disabled={!canNext || update.isPending}
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="press flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLast ? "Enter FlowState" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
