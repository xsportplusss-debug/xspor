import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { loadFromCloud, initAutoSync, stopSync } from "@/lib/cloud-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Status = "loading" | "auth" | "hydrating" | "ready";

let syncInitialized = false;

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const handleSession = async (userId: string) => {
      setStatus("hydrating");
      await loadFromCloud(userId);
      if (!syncInitialized) {
        initAutoSync();
        syncInitialized = true;
      }
      if (!cancelled) setStatus("ready");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) handleSession(data.session.user.id);
      else setStatus("auth");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) handleSession(session.user.id);
      if (event === "SIGNED_OUT") {
        stopSync();
        setStatus("auth");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading" || status === "hydrating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{status === "hydrating" ? "Verileriniz yükleniyor..." : "Yükleniyor..."}</span>
        </div>
      </div>
    );
  }

  if (status === "auth") return <AuthScreen />;
  return <>{children}</>;
}

function AuthScreen() {
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Giriş başarısız");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md glass shadow-elegant">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Fintra</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Google hesabınızla giriş yapın
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <Button onClick={signIn} disabled={busy} className="w-full" variant="outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <GoogleIcon /> <span className="ml-2">Google ile Giriş Yap</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.4 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.4 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.8-1.9 13.3-5.1l-6.1-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.1 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
