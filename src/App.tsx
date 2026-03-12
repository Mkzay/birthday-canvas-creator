import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";

const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreatePage = lazy(() => import("./pages/CreatePage"));
const EditPage = lazy(() => import("./pages/EditPage"));
const ContributePage = lazy(() => import("./pages/ContributePage"));
const BirthdayPage = lazy(() => import("./pages/BirthdayPage"));
const PreviewPage = lazy(() => import("./pages/PreviewPage"));
const ThemeBuilderPage = lazy(() => import("./pages/ThemeBuilderPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
