import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { useEffect } from "react";
import WishCanvasLoader from "@/components/WishCanvasLoader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyImport = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name: string
) => {
  return lazy(async () => {
    try {
      const component = await factory();
      window.sessionStorage.removeItem(`vite-chunk-reload-${name}`);
      return component;
    } catch (error: unknown) {
      const key = `vite-chunk-reload-${name}`;
      const hasReloaded = window.sessionStorage.getItem(key);
      if (!hasReloaded) {
        window.sessionStorage.setItem(key, 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
};

const Index = lazyImport(() => import("./pages/Index"), "Index");
const AuthPage = lazyImport(() => import("./pages/AuthPage"), "AuthPage");
const VerifyEmailPage = lazyImport(() => import("./pages/VerifyEmailPage"), "VerifyEmailPage");
const Dashboard = lazyImport(() => import("./pages/Dashboard"), "Dashboard");
const CreatePage = lazyImport(() => import("./pages/CreatePage"), "CreatePage");
const EditPage = lazyImport(() => import("./pages/EditPage"), "EditPage");
const ContributePage = lazyImport(() => import("./pages/ContributePage"), "ContributePage");
const BirthdayPage = lazyImport(() => import("./pages/BirthdayPage"), "BirthdayPage");
const PreviewPage = lazyImport(() => import("./pages/PreviewPage"), "PreviewPage");
const ThemeBuilderPage = lazyImport(() => import("./pages/ThemeBuilderPage"), "ThemeBuilderPage");
const SettingsPage = lazyImport(() => import("./pages/SettingsPage"), "SettingsPage");
const NotFound = lazyImport(() => import("./pages/NotFound"), "NotFound");

const queryClient = new QueryClient();

const RouteLoader = () => (
  <WishCanvasLoader />
);

const APP_NAME = "WishCanvas";

const SeoController = () => {
  const location = useLocation();

  useEffect(() => {
    const upsertMeta = (selector: string, attrName: string, attrValue: string, content: string) => {
      const existing = document.querySelector(selector) || document.createElement("meta");
      existing.setAttribute(attrName, attrValue);
      existing.setAttribute("content", content);
      document.head.appendChild(existing);
    };

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
    const url = `${origin}${pathname}`;

    if (pathname === "/") {
      setTitle("Create collaborative birthday surprises");
      robots.setAttribute("content", "index,follow");
      canonical.setAttribute("href", `${origin}/`);
      upsertMeta('meta[property="og:title"]', "property", "og:title", `Create collaborative birthday surprises | ${APP_NAME}`);
      upsertMeta('meta[property="og:description"]', "property", "og:description", "Create a collaborative birthday page with wishes, photos, and voice notes.");
      upsertMeta('meta[property="og:url"]', "property", "og:url", `${origin}/`);
      upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
      upsertMeta('meta[property="og:image"]', "property", "og:image", `${origin}/wish-canvas-logo.png`);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `Create collaborative birthday surprises | ${APP_NAME}`);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Create a collaborative birthday page with wishes, photos, and voice notes.");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${origin}/wish-canvas-logo.png`);
      return;
    }

    if (pathname.startsWith("/contribute/")) {
      setTitle("Add your birthday wish");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}${pathname}`);
      upsertMeta('meta[property="og:title"]', "property", "og:title", `Add your birthday wish | ${APP_NAME}`);
      upsertMeta('meta[property="og:description"]', "property", "og:description", "Add a wish, photo, or voice note to the birthday story.");
      upsertMeta('meta[property="og:url"]', "property", "og:url", url);
      upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
      upsertMeta('meta[property="og:image"]', "property", "og:image", `${origin}/wish-canvas-logo.png`);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `Add your birthday wish | ${APP_NAME}`);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Add a wish, photo, or voice note to the birthday story.");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${origin}/wish-canvas-logo.png`);
      return;
    }

    if (pathname.startsWith("/birthday/")) {
      setTitle("Happy Birthday!");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}${pathname}`);
      upsertMeta('meta[property="og:title"]', "property", "og:title", `Happy Birthday! | ${APP_NAME}`);
      upsertMeta('meta[property="og:description"]', "property", "og:description", "Open the birthday story: wishes, photos, and voice notes in one replayable link.");
      upsertMeta('meta[property="og:url"]', "property", "og:url", url);
      upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
      upsertMeta('meta[property="og:image"]', "property", "og:image", `${origin}/wish-canvas-logo.png`);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `Happy Birthday! | ${APP_NAME}`);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Open the birthday story: wishes, photos, and voice notes in one replayable link.");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${origin}/wish-canvas-logo.png`);
      return;
    }

    if (pathname === "/auth") {
      setTitle("Sign in");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}/auth`);
      return;
    }

    if (pathname === "/verify-email") {
      setTitle("Verify email");
      robots.setAttribute("content", "noindex,nofollow");
      canonical.setAttribute("href", `${origin}/verify-email`);
      return;
    }

    setTitle("WishCanvas");
    robots.setAttribute("content", "noindex,nofollow");
    canonical.setAttribute("href", `${origin}${pathname}`);
    upsertMeta('meta[property="og:title"]', "property", "og:title", `${APP_NAME}`);
    upsertMeta('meta[property="og:description"]', "property", "og:description", "Birthday wishes, photos, and voice notes—beautifully delivered.");
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[property="og:image"]', "property", "og:image", `${origin}/wish-canvas-logo.png`);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `${APP_NAME}`);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Birthday wishes, photos, and voice notes—beautifully delivered.");
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${origin}/wish-canvas-logo.png`);
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
              <Route path="/verify-email" element={<VerifyEmailPage />} />
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
