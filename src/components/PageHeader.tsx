import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/useAppStore";

export function PageHeader() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar placa, pneu, QR Code..."
            className="pl-9 w-64 h-9 text-sm bg-muted border-0"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleDarkMode}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
