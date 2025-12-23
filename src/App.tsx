import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CreatePage from "./pages/CreatePage";
import EditPage from "./pages/EditPage";
import ContributePage from "./pages/ContributePage";
import BirthdayPage from "./pages/BirthdayPage";
import PreviewPage from "./pages/PreviewPage";
import ThemeBuilderPage from "./pages/ThemeBuilderPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/edit/:pageId" element={<EditPage />} />
            <Route path="/contribute/:pageId" element={<ContributePage />} />
            <Route path="/birthday/:pageId" element={<BirthdayPage />} />
            <Route path="/preview/:pageId" element={<PreviewPage />} />
            <Route path="/themes" element={<ThemeBuilderPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
