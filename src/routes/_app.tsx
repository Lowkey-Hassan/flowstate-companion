import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="inline-block h-2.5 w-2.5 animate-gold-dot rounded-full bg-gold" />
    </div>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const profile = useProfile();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) return <Splash />;
  if (profile.isLoading) return <Splash />;
  if (profile.data && !profile.data.onboarding_complete) return <Onboarding />;

  return <AppShell />;
}
