import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import { useEffect } from "react";

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

const APP_NAME = "WishCanvas";

const SeoController = () => {
  const location = useLocation();

  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]') || document.createElement("meta");
    robots.setAttribute("name", "robots");
    document.head.appendChild(robots);

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);

    const setTitle = (title: string) => {
      document.title = `${title} | ${APP_NAME}`;
    };

    const origin = window.location.origin;
    const pathname = location.pathname;

    if (pathname === "/") {
      setTitle("Create collaborative birthday surprises");
      robots.setAttribute("content", "index,follow");
      canonical.setAttribute("href", `${origin}/`);
      return;
    }

    if (pathname.startsWith("/contribute/")) {
      setTitle("Add your birthday wish");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}${pathname}`);
      return;
    }

    if (pathname.startsWith("/birthday/")) {
      setTitle("Happy Birthday!");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}${pathname}`);
      return;
    }

    if (pathname === "/auth") {
      setTitle("Sign in");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}/auth`);
      return;
    }

    setTitle("WishCanvas");
    robots.setAttribute("content", "noindex,nofollow");
    canonical.setAttribute("href", `${origin}${pathname}`);
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SeoController />
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
