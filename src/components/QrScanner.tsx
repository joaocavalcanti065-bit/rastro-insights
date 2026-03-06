import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function QrScanner({ open, onClose, onScan }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerId = "qr-reader";

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
            onClose();
          },
          () => {}
        )
        .catch((err) => {
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
          console.error(err);
        });
    }, 300);

    return () => {
      clearTimeout(timeout);
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
      setError(null);
    };
  }, [open, onScan, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Ler QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            id={containerId}
            className="w-full rounded-lg overflow-hidden bg-muted min-h-[280px]"
          />
          {error && (
            <div className="flex flex-col items-center gap-2 text-center">
              <CameraOff className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Aponte a câmera para o QR Code do pneu
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
