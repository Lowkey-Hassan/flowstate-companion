import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Check } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";
import { useProfile, useUpdateProfile, traitsOf } from "@/lib/profile";
import { useAuth } from "@/lib/auth";
import { ADHD_TRAITS, ANCHOR_TIMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — FlowState" }] }),
  component: SettingsPage,
});

const TONES = [
  { id: "gentle", label: "Gentle" },
  { id: "direct", label: "Direct" },
  { id: "tough", label: "Tough love" },
];

function SettingsPage() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const { signOut, user } = useAuth();

  const p = profile.data;
  const [name, setName] = useState(p?.name ?? "");
  const traits = traitsOf(p);

  const toggleTrait = (t: string) => {
    const next = traits.includes(t)
      ? traits.filter((x) => x !== t)
      : [...traits, t];
    update.mutate({ adhd_traits: next });
  };

  const saveName = () => {
    update.mutate(
      { name: name.trim() || null },
      { onSuccess: () => toast("Saved.") },
    );
  };

  if (!p) return null;

  return (
    <div>
      <PageTitle eyebrow="Settings" title="Your space, your rules." />

      <Block label="Name">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 flex-1 rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground outline-none focus:border-gold/60"
          />
          <button
            onClick={saveName}
            className="press rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </Block>

      <Block label="ADHD traits">
        <div className="grid grid-cols-2 gap-2">
          {ADHD_TRAITS.map((t) => {
            const on = traits.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTrait(t)}
                className={cn(
                  "press flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
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
      </Block>

      <Block label="Coach tone">
        <div className="flex gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => update.mutate({ coach_tone: t.id })}
              className={cn(
                "press flex-1 rounded-lg border py-2.5 text-sm transition-colors",
                p.coach_tone === t.id
                  ? "border-gold/60 bg-surface-2 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Block>

      <Block label="Daily anchor">
        <div className="flex gap-2">
          {ANCHOR_TIMES.map((a) => (
            <button
              key={a.id}
              onClick={() => update.mutate({ anchor_time: a.id })}
              className={cn(
                "press flex-1 rounded-lg border py-2.5 text-sm transition-colors",
                p.anchor_time === a.id
                  ? "border-gold/60 bg-surface-2 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-accent",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Block>

      <div className="mt-10 border-t border-border pt-6">
        <p className="mb-3 text-xs text-muted-foreground">
          Signed in as {user?.email}
        </p>
        <button
          onClick={() => signOut()}
          className="press flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
