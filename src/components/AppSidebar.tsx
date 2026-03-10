import {
  LayoutDashboard, Truck, Circle, Package, MapPin, RefreshCw,
  Wrench, Bell, FileText, Settings, Link2, Cog, LogOut
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoRastro from "@/assets/logo-rastro.jpg";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Frota", url: "/frota", icon: Truck },
  { title: "Pneus", url: "/pneus", icon: Circle },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Endereçamento", url: "/enderecamento", icon: MapPin },
  { title: "Recapagem", url: "/recapagem", icon: RefreshCw },
  { title: "Manutenção", url: "/manutencao", icon: Wrench },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Cadastros", url: "/cadastros", icon: Settings },
  { title: "Integrações", url: "/integracoes", icon: Link2 },
  { title: "Configurações", url: "/configuracoes", icon: Cog },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-6">
            <div className="flex items-center gap-2">
              <img src={logoRastro} alt="Logo Rastro" className="h-10 w-auto rounded" />
              {open && (
                <div className="flex flex-col">
                  <span className="font-bold text-base leading-tight">Rastro</span>
                  <span className="text-[10px] text-sidebar-foreground/60 leading-tight">Pneus, Estoque e Recapagem</span>
                </div>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {open && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
