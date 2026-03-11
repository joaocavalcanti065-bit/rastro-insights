import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/useAppStore";

export function PageHeader() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder="Buscar placa, pneu, QR Code..."
            className="pl-8 w-64 h-7 text-xs bg-muted/50 border-0 rounded-md"
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleDarkMode}>
          {darkMode ? <Sun className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  );
}
