import {
  LayoutDashboard, Truck, Circle, Package, MapPin, RefreshCw,
  Wrench, Bell, FileText, Settings, Link2, Cog, LogOut, Activity, BarChart3, Bot
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
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
  { title: "Eficiência", url: "/eficiencia", icon: BarChart3 },
  { title: "Assistente IA", url: "/assistente-ia", icon: Bot },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Cadastros", url: "/cadastros", icon: Settings },
  { title: "Integrações", url: "/integracoes", icon: Link2 },
  { title: "Configurações", url: "/configuracoes", icon: Cog },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();

  const { data: alertasAtivos = 0 } = useQuery({
    queryKey: ["alertas-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("alertas")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

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
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-sidebar-primary" strokeWidth={1.5} />
              </div>
              {open && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">Rastro Insights</span>
                  <span className="text-[10px] text-sidebar-foreground/50 tracking-wide uppercase">Inteligência Logística</span>
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
                        `flex items-center gap-3 px-4 py-2 rounded-md transition-all text-[13px] ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <div className="relative shrink-0">
                        <item.icon className="h-4 w-4" strokeWidth={1.5} />
                        {item.title === "Alertas" && alertasAtivos > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none">
                            {alertasAtivos > 99 ? "99+" : alertasAtivos}
                          </span>
                        )}
                      </div>
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/50 hover:text-destructive text-xs" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          {open && <span>Encerrar sessão</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
