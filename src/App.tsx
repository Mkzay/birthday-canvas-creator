import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreatePage from "./pages/CreatePage";
import EditPage from "./pages/EditPage";
import ContributePage from "./pages/ContributePage";
import BirthdayPage from "./pages/BirthdayPage";
import PreviewPage from "./pages/PreviewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/edit/:pageId" element={<EditPage />} />
            <Route path="/contribute/:pageId" element={<ContributePage />} />
            <Route path="/birthday/:pageId" element={<BirthdayPage />} />
            <Route path="/preview/:pageId" element={<PreviewPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
