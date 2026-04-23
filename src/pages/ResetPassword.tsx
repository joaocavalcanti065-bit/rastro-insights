import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoRastro from "@/assets/logo-rastro.jpg";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

type LinkStatus = "checking" | "valid" | "invalid" | "expired";

const passwordSchema = z
  .string()
  .min(8, { message: "A senha deve ter no mínimo 8 caracteres." })
  .max(72, { message: "A senha deve ter no máximo 72 caracteres." })
  .regex(/[A-Z]/, { message: "Inclua ao menos uma letra maiúscula." })
  .regex(/[a-z]/, { message: "Inclua ao menos uma letra minúscula." })
  .regex(/[0-9]/, { message: "Inclua ao menos um número." });

const formSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: "Confirme a nova senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  match: boolean;
}

function evaluateChecks(password: string, confirm: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirm,
  };
}

function strengthScore(c: PasswordChecks): number {
  return [c.length, c.upper, c.lower, c.number].filter(Boolean).length;
}

const STRENGTH_LABELS = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-amber-400",
  "bg-emerald-500",
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");
  const [linkErrorMessage, setLinkErrorMessage] = useState<string>("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Progress phases
  type Phase = "validating" | "updating" | "confirming" | "done";
  const [phase, setPhase] = useState<Phase | null>(null);
  const [progress, setProgress] = useState(0);

  const PHASE_META: Record<Phase, { label: string; target: number }> = {
    validating: { label: "Validando dados...", target: 25 },
    updating: { label: "Atualizando senha...", target: 70 },
    confirming: { label: "Confirmando alteração...", target: 95 },
    done: { label: "Concluído!", target: 100 },
  };

  // Detect link validity from URL hash / query and PASSWORD_RECOVERY event
  useEffect(() => {
    let resolved = false;

    const parseHashError = () => {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const error = params.get("error");
      const errorCode = params.get("error_code");
      const errorDescription = params.get("error_description");
      return { error, errorCode, errorDescription };
    };

    const { error, errorCode, errorDescription } = parseHashError();

    if (error) {
      resolved = true;
      const description = errorDescription?.replace(/\+/g, " ") ?? "";
      const isExpired =
        errorCode === "otp_expired" ||
        /expired/i.test(description) ||
        /expired/i.test(error);

      setLinkStatus(isExpired ? "expired" : "invalid");
      setLinkErrorMessage(
        isExpired
          ? "O link de recuperação expirou. Solicite um novo email para continuar."
          : description || "O link de recuperação é inválido ou já foi utilizado."
      );
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolved = true;
        setLinkStatus("valid");
      }
    });

    // Fallback: if there's already a session from the recovery link, allow update
    supabase.auth.getSession().then(({ data }) => {
      if (resolved) return;
      if (data.session) {
        setLinkStatus("valid");
      }
    });

    // Timeout: if no recovery event within 4s and no session, treat as invalid
    const timeout = setTimeout(() => {
      if (!resolved) {
        setLinkStatus((prev) => (prev === "checking" ? "invalid" : prev));
        setLinkErrorMessage(
          "Não foi possível validar o link de recuperação. Ele pode ter expirado ou já ter sido utilizado."
        );
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const checks = useMemo(() => evaluateChecks(password, confirmPassword), [password, confirmPassword]);
  const score = strengthScore(checks);
  const strengthIndex = password.length === 0 ? 0 : Math.max(1, score);
  const allValid =
    checks.length && checks.upper && checks.lower && checks.number && checks.match;

  const runPhase = (next: Phase) => {
    setPhase(next);
    setProgress(PHASE_META[next].target);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = formSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const errs: { password?: string; confirmPassword?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "password" | "confirmPassword";
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      toast.error("Verifique os campos destacados.");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    runPhase("validating");

    // brief visual delay so users perceive the validation step
    await new Promise((r) => setTimeout(r, 300));
    runPhase("updating");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      // reset progress UI on failure
      setPhase(null);
      setProgress(0);
      setIsLoading(false);

      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("same") || msg.includes("different from the old")) {
        toast.error("A nova senha deve ser diferente da anterior.");
        setFieldErrors({ password: "Use uma senha diferente da atual." });
      } else if (msg.includes("session") || msg.includes("expired") || msg.includes("jwt")) {
        toast.error("Sua sessão de recuperação expirou. Solicite um novo link.");
        setLinkStatus("expired");
        setLinkErrorMessage("Sua sessão de recuperação expirou enquanto você preenchia o formulário.");
      } else if (msg.includes("weak") || msg.includes("password")) {
        toast.error("Senha muito fraca. Tente uma combinação mais forte.");
        setFieldErrors({ password: error.message });
      } else {
        toast.error(error.message || "Não foi possível atualizar a senha.");
      }
      return;
    }

    runPhase("confirming");
    await new Promise((r) => setTimeout(r, 350));
    runPhase("done");
    await new Promise((r) => setTimeout(r, 250));

    setIsLoading(false);
    setSuccess(true);
    toast.success("Senha atualizada com sucesso!");
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  // ---------- Render: success ----------
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center border-border/50">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-xl font-semibold">Senha atualizada!</CardTitle>
            <CardDescription className="text-sm">
              Sua senha foi redefinida com sucesso.
              <br />
              Redirecionando para o painel...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ---------- Render: link invalid/expired ----------
  if (linkStatus === "invalid" || linkStatus === "expired") {
    const isExpired = linkStatus === "expired";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="space-y-4 text-center">
            <div
              className={cn(
                "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                isExpired ? "bg-amber-500/10" : "bg-destructive/10"
              )}
            >
              {isExpired ? (
                <ShieldAlert className="h-7 w-7 text-amber-500" strokeWidth={1.5} />
              ) : (
                <XCircle className="h-7 w-7 text-destructive" strokeWidth={1.5} />
              )}
            </div>
            <CardTitle className="text-xl font-semibold">
              {isExpired ? "Link expirado" : "Link inválido"}
            </CardTitle>
            <CardDescription className="text-sm">{linkErrorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">O que fazer agora?</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Solicite um novo link de recuperação</li>
                <li>Abra o email mais recente recebido</li>
                <li>Clique no link em até 1 hora</li>
              </ol>
            </div>
            <Button className="w-full h-9 text-sm" onClick={() => navigate("/forgot-password")}>
              Solicitar novo link
            </Button>
            <Button
              variant="ghost"
              className="w-full h-9 text-sm"
              onClick={() => navigate("/auth")}
            >
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Render: checking ----------
  if (linkStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Render: valid form ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <img src={logoRastro} alt="Logo Rastro" className="h-16 w-auto" />
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-xl font-semibold">Redefinir senha</CardTitle>
            <CardDescription className="text-sm">
              Crie uma nova senha forte para proteger sua conta.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">
                Nova senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoComplete="new-password"
                  autoFocus
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : "password-strength"}
                  className="h-9 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div id="password-strength" className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < score ? STRENGTH_COLORS[strengthIndex] : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Força: <span className="font-medium text-foreground">{STRENGTH_LABELS[strengthIndex]}</span>
                  </p>
                </div>
              )}

              {fieldErrors.password && (
                <p
                  id="password-error"
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium">
                Confirmar nova senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
                  className="h-9 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p
                  id="confirm-error"
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Requirements checklist */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5">
              <p className="text-[11px] font-medium text-foreground">Requisitos da senha:</p>
              <ul className="space-y-1 text-[11px]">
                <RequirementItem ok={checks.length} label="Mínimo de 8 caracteres" />
                <RequirementItem ok={checks.upper} label="Uma letra maiúscula (A-Z)" />
                <RequirementItem ok={checks.lower} label="Uma letra minúscula (a-z)" />
                <RequirementItem ok={checks.number} label="Um número (0-9)" />
                <RequirementItem ok={checks.match} label="As duas senhas coincidem" />
              </ul>
            </div>

            {/* Progress panel during submit */}
            {isLoading && phase && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {phase === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  )}
                  <p className="text-xs font-medium text-foreground">
                    {PHASE_META[phase].label}
                  </p>
                  <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-9 text-sm font-medium"
              disabled={isLoading || !allValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  {phase ? PHASE_META[phase].label : "Atualizando senha..."}
                </>
              ) : (
                "Atualizar senha"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-9 text-sm"
              onClick={() => navigate("/auth")}
              disabled={isLoading}
            >
              Cancelar e voltar ao login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RequirementItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        ok ? "text-emerald-500" : "text-muted-foreground"
      )}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{label}</span>
    </li>
  );
}
