import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Activity, Shield, BarChart3, Truck } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        toast.error("Email ainda não confirmado. Verifique sua caixa de entrada.");
      } else {
        toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
      }
    } else {
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const nome = formData.get("nome") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome_completo: nome },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setEmailSent(true);
      toast.success("Conta criada! Verifique seu email para confirmar.");
    }
    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-border/50">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-xl font-semibold">Verifique seu email</CardTitle>
            <CardDescription className="text-sm">
              Enviamos um email de confirmação. Clique no link para ativar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Não recebeu? Verifique sua pasta de spam ou aguarde alguns minutos.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card relative overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        <div className="absolute inset-0 bg-data-watermark" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <span className="font-semibold text-foreground tracking-tight">Rastro Insights</span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Inteligência Logística</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground leading-tight tracking-tight">
                Transforme dados de frota em<br />
                <span className="text-primary">economia real.</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Portal de inteligência financeira para gestores que buscam reduzir custos operacionais e maximizar a vida útil dos ativos.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: BarChart3, label: "Telemetria Preditiva", value: "+20%" },
                { icon: Shield, label: "Gestão de Risco", value: "-15%" },
                { icon: Truck, label: "Economia Circular", value: "R$ 1.8k" },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/50 tracking-wide">
            Powered by Rastro Inteligência · v2.0
          </p>
        </div>
      </div>

      {/* Right panel — Auth */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-foreground tracking-tight">Rastro Insights</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Acesse sua conta</h2>
            <p className="text-xs text-muted-foreground">Entre para acessar o portal de inteligência</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="login" className="text-xs">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs">Registrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="seu@email.com" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••" required className="h-9 text-sm" />
                </div>
                <Button type="submit" className="w-full h-9 text-sm font-medium" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    onClick={async () => {
                      const email = (document.getElementById("email") as HTMLInputElement)?.value;
                      if (!email) {
                        toast.error("Digite seu email primeiro.");
                        return;
                      }
                      setIsLoading(true);
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) {
                        toast.error(error.message);
                      } else {
                        toast.success("Email de recuperação enviado!");
                      }
                      setIsLoading(false);
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-medium">Nome Completo</Label>
                  <Input id="signup-name" name="nome" type="text" placeholder="João Silva" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-medium">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="seu@email.com" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-medium">Senha</Label>
                  <Input id="signup-password" name="password" type="password" placeholder="••••••••" minLength={6} required className="h-9 text-sm" />
                </div>
                <Button type="submit" className="w-full h-9 text-sm font-medium" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
