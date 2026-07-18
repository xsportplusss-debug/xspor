import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadFromCloud, initAutoSync, stopSync } from "@/lib/cloud-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Status = "loading" | "auth" | "hydrating" | "ready";

let syncInitialized = false;

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const hydrate = async (userId: string) => {
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
      if (data.session) hydrate(data.session.user.id);
      else setStatus("auth");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) hydrate(session.user.id);
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
  const [tab, setTab] = useState("signin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md glass shadow-elegant">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Fintra</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Verileriniz tüm cihazlarınızda güncel kalır
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Giriş Yap</TabsTrigger>
              <TabsTrigger value="signup">Kayıt Ol</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  return (
    <form onSubmit={submit} className="space-y-3 pt-4">
      <div><Label>E-posta</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><Label>Şifre</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Giriş Yap"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Hesap oluşturuldu. Giriş yapabilirsiniz.");
  };

  return (
    <form onSubmit={submit} className="space-y-3 pt-4">
      <div><Label>E-posta</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><Label>Şifre (en az 6 karakter)</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kayıt Ol"}
      </Button>
    </form>
  );
}
