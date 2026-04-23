import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Informe seu email." })
    .email({ message: "Formato de email inválido." })
    .max(255, { message: "Email muito longo." }),
});

const COOLDOWN_SECONDS = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentTo, setSentTo] = useState("");

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const sendRecoveryEmail = async (targetEmail: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("rate") || msg.includes("limit")) {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (msg.includes("invalid") && msg.includes("email")) {
        toast.error("Email inválido.");
      } else {
        toast.error(error.message || "Não foi possível enviar o email de recuperação.");
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Email inválido.";
      setEmailError(msg);
      return;
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const ok = await sendRecoveryEmail(normalizedEmail);

    if (ok) {
      setSentTo(normalizedEmail);
      setSent(true);
      startCooldown();
      toast.success("Email de recuperação enviado!", {
        description: "Verifique sua caixa de entrada e a pasta de spam.",
      });
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;
    const ok = await sendRecoveryEmail(sentTo);
    if (ok) {
      startCooldown();
      toast.success("Email reenviado!");
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-xl font-semibold">Verifique seu email</CardTitle>
            <CardDescription className="text-sm">
              Enviamos um link de recuperação para
              <br />
              <span className="font-medium text-foreground">{sentTo}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Próximos passos:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Abra o email recebido</li>
                <li>Clique no link "Redefinir senha"</li>
                <li>Defina uma nova senha (mínimo 6 caracteres)</li>
              </ol>
              <p className="pt-2 text-[11px]">
                O link expira em 1 hora. Não recebeu? Verifique a pasta de spam.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-9 text-sm"
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Reenviando...
                </>
              ) : cooldown > 0 ? (
                `Reenviar em ${cooldown}s`
              ) : (
                "Reenviar email"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-9 text-sm"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-xl font-semibold">Esqueci minha senha</CardTitle>
            <CardDescription className="text-sm">
              Informe seu email cadastrado e enviaremos um link para redefinir sua senha.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                className="h-9 text-sm"
              />
              {emailError && (
                <p
                  id="email-error"
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-9 text-sm font-medium" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
              Por segurança, sempre exibimos a confirmação de envio — mesmo que o email
              não esteja cadastrado, ninguém poderá descobrir.
            </div>

            <Link
              to="/auth"
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pt-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar ao login
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
