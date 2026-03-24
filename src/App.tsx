import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/PageHeader";
import { AlertaRealtimeListener } from "@/components/AlertaRealtimeListener";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Frota from "./pages/Frota";
import PneusPage from "./pages/PneusPage";
import EstoquePage from "./pages/EstoquePage";
import EnderecamentoPage from "./pages/EnderecamentoPage";
import RecapagemPage from "./pages/RecapagemPage";
import ManutencaoPage from "./pages/ManutencaoPage";
import AlertasPage from "./pages/AlertasPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import CadastrosPage from "./pages/CadastrosPage";
import IntegracoesPage from "./pages/IntegracoesPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import ResetPassword from "./pages/ResetPassword";
import PneuProfilePage from "./pages/PneuProfilePage";
import EficienciaPage from "./pages/EficienciaPage";
import AssistenteIAPage from "./pages/AssistenteIAPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedLayout = ({ children, session }: { children: React.ReactNode; session: Session | null }) => {
  if (!session) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
        <AlertaRealtimeListener />
      </div>
    </SidebarProvider>
  );
};

function AppInit() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  return null;
}

const AppRoutes = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedLayout session={session}><Dashboard /></ProtectedLayout>} />
      <Route path="/frota" element={<ProtectedLayout session={session}><Frota /></ProtectedLayout>} />
      <Route path="/pneus" element={<ProtectedLayout session={session}><PneusPage /></ProtectedLayout>} />
      <Route path="/pneu/:rg" element={<ProtectedLayout session={session}><PneuProfilePage /></ProtectedLayout>} />
      <Route path="/estoque" element={<ProtectedLayout session={session}><EstoquePage /></ProtectedLayout>} />
      <Route path="/enderecamento" element={<ProtectedLayout session={session}><EnderecamentoPage /></ProtectedLayout>} />
      <Route path="/recapagem" element={<ProtectedLayout session={session}><RecapagemPage /></ProtectedLayout>} />
      <Route path="/manutencao" element={<ProtectedLayout session={session}><ManutencaoPage /></ProtectedLayout>} />
      <Route path="/alertas" element={<ProtectedLayout session={session}><AlertasPage /></ProtectedLayout>} />
      <Route path="/eficiencia" element={<ProtectedLayout session={session}><EficienciaPage /></ProtectedLayout>} />
      <Route path="/assistente-ia" element={<ProtectedLayout session={session}><AssistenteIAPage /></ProtectedLayout>} />
      <Route path="/relatorios" element={<ProtectedLayout session={session}><RelatoriosPage /></ProtectedLayout>} />
      <Route path="/cadastros" element={<ProtectedLayout session={session}><CadastrosPage /></ProtectedLayout>} />
      <Route path="/integracoes" element={<ProtectedLayout session={session}><IntegracoesPage /></ProtectedLayout>} />
      <Route path="/configuracoes" element={<ProtectedLayout session={session}><ConfiguracoesPage /></ProtectedLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppInit />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
