import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Lock, Unlock, ShieldAlert } from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RETROACTIVE_CODE = "188013";

interface RetroactiveDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  label?: string;
  className?: string;
}

/**
 * DatePicker that allows past dates only after entering a special access code.
 * Today's date is always allowed without code.
 */
export function RetroactiveDatePicker({ date, onDateChange, label = "Data", className }: RetroactiveDatePickerProps) {
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleDateSelect = (selected: Date | undefined) => {
    if (!selected) return;

    const today = startOfDay(new Date());
    const selectedDay = startOfDay(selected);

    // If it's today or future, allow directly
    if (!isBefore(selectedDay, today)) {
      onDateChange(selected);
      return;
    }

    // Past date: check if already unlocked
    if (unlocked) {
      onDateChange(selected);
      return;
    }

    // Need code verification
    setPendingDate(selected);
    setCodeInput("");
    setCodeDialogOpen(true);
  };

  const handleCodeSubmit = () => {
    if (codeInput === RETROACTIVE_CODE) {
      setUnlocked(true);
      setCodeDialogOpen(false);
      setAttempts(0);
      if (pendingDate) {
        onDateChange(pendingDate);
        setPendingDate(null);
      }
      toast.success("Acesso retroativo liberado para esta sessão");
    } else {
      setAttempts(prev => prev + 1);
      toast.error("Código incorreto");
      if (attempts >= 2) {
        setCodeDialogOpen(false);
        setAttempts(0);
        setPendingDate(null);
        toast.error("Muitas tentativas. Tente novamente mais tarde.");
      }
    }
  };

  return (
    <>
      <div className={className}>
        <Label className="flex items-center gap-1.5">
          {label}
          {unlocked && <Unlock className="h-3 w-3 text-chart-2" />}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
              {!unlocked && (
                <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        {!unlocked && (
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            Datas anteriores requerem código de acesso
          </p>
        )}
      </div>

      {/* Code verification dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={v => { if (!v) { setCodeDialogOpen(false); setPendingDate(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Código de Acesso Retroativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para registrar dados com data anterior ({pendingDate ? format(pendingDate, "dd/MM/yyyy") : ""}), 
              insira o código de autorização.
            </p>
            <div>
              <Label>Código de acesso</Label>
              <Input
                type="password"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCodeSubmit()}
                placeholder="Digite o código"
                autoFocus
                maxLength={10}
              />
            </div>
            {attempts > 0 && (
              <p className="text-xs text-destructive">
                Código incorreto. Tentativa {attempts}/3.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setCodeDialogOpen(false); setPendingDate(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleCodeSubmit} disabled={!codeInput}>
                Verificar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
