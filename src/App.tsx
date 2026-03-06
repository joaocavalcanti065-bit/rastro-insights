import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageHeader } from "@/components/PageHeader";
import { useEffect } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Frota from "./pages/Frota";
import PneusPage from "./pages/PneusPage";
import EstoquePage from "./pages/EstoquePage";
import RecapagemPage from "./pages/RecapagemPage";
import ManutencaoPage from "./pages/ManutencaoPage";
import AlertasPage from "./pages/AlertasPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import CadastrosPage from "./pages/CadastrosPage";
import IntegracoesPage from "./pages/IntegracoesPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppInit />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/frota" element={<ProtectedLayout><Frota /></ProtectedLayout>} />
          <Route path="/pneus" element={<ProtectedLayout><PneusPage /></ProtectedLayout>} />
          <Route path="/estoque" element={<ProtectedLayout><EstoquePage /></ProtectedLayout>} />
          <Route path="/recapagem" element={<ProtectedLayout><RecapagemPage /></ProtectedLayout>} />
          <Route path="/manutencao" element={<ProtectedLayout><ManutencaoPage /></ProtectedLayout>} />
          <Route path="/alertas" element={<ProtectedLayout><AlertasPage /></ProtectedLayout>} />
          <Route path="/relatorios" element={<ProtectedLayout><RelatoriosPage /></ProtectedLayout>} />
          <Route path="/cadastros" element={<ProtectedLayout><CadastrosPage /></ProtectedLayout>} />
          <Route path="/integracoes" element={<ProtectedLayout><IntegracoesPage /></ProtectedLayout>} />
          <Route path="/configuracoes" element={<ProtectedLayout><ConfiguracoesPage /></ProtectedLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
