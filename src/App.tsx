import { Suspense, lazy, useEffect, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import WishCanvasLoader from "@/components/WishCanvasLoader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyImport = <T extends ComponentType<any>>(
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

const routeModuleLoaders = {
  Index: () => import("./pages/Index"),
  AuthPage: () => import("./pages/AuthPage"),
  VerifyEmailPage: () => import("./pages/VerifyEmailPage"),
  Dashboard: () => import("./pages/Dashboard"),
  AdminPage: () => import("./pages/AdminPage"),
  CreatePage: () => import("./pages/CreatePage"),
  EditPage: () => import("./pages/EditPage"),
  ContributePage: () => import("./pages/ContributePage"),
  BirthdayPage: () => import("./pages/BirthdayPage"),
  PreviewPage: () => import("./pages/PreviewPage"),
  ThemeBuilderPage: () => import("./pages/ThemeBuilderPage"),
  UpgradePage: () => import("./pages/UpgradePage"),
  SettingsPage: () => import("./pages/SettingsPage"),
  AcceptInvitePage: () => import("./pages/AcceptInvitePage"),
  NotFound: () => import("./pages/NotFound"),
  LegalPage: () => import("./pages/LegalPage"),
};

type RouteModuleKey = keyof typeof routeModuleLoaders;
const prefetchedRouteModules = new Set<RouteModuleKey>();

const canPrefetchOnCurrentConnection = () => {
  if (typeof navigator === "undefined") return false;

  const navWithConnection = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const connection = navWithConnection.connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") return false;

  return true;
};

const prefetchRouteModule = (moduleKey: RouteModuleKey) => {
  if (!canPrefetchOnCurrentConnection()) return;
  if (prefetchedRouteModules.has(moduleKey)) return;

  prefetchedRouteModules.add(moduleKey);
  void routeModuleLoaders[moduleKey]().catch(() => {
    prefetchedRouteModules.delete(moduleKey);
  });
};

const moduleKeyFromPathname = (pathname: string): RouteModuleKey | null => {
  if (pathname === "/") return "Index";
  if (pathname === "/auth") return "AuthPage";
  if (pathname === "/verify-email") return "VerifyEmailPage";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/admin") return "AdminPage";
  if (pathname === "/create") return "CreatePage";
  if (pathname === "/themes") return "ThemeBuilderPage";
  if (pathname === "/upgrade" || pathname === "/billing") return "UpgradePage";
  if (pathname === "/settings") return "SettingsPage";
  if (pathname.startsWith("/edit/")) return "EditPage";
  if (pathname.startsWith("/contribute/")) return "ContributePage";
  if (pathname.startsWith("/birthday/")) return "BirthdayPage";
  if (pathname.startsWith("/preview/")) return "PreviewPage";
  if (pathname.startsWith("/organize/")) return "AcceptInvitePage";

  return null;
};

const Index = lazyImport(routeModuleLoaders.Index, "Index");
const AuthPage = lazyImport(routeModuleLoaders.AuthPage, "AuthPage");
const VerifyEmailPage = lazyImport(routeModuleLoaders.VerifyEmailPage, "VerifyEmailPage");
const Dashboard = lazyImport(routeModuleLoaders.Dashboard, "Dashboard");
const AdminPage = lazyImport(routeModuleLoaders.AdminPage, "AdminPage");
const CreatePage = lazyImport(routeModuleLoaders.CreatePage, "CreatePage");
const EditPage = lazyImport(routeModuleLoaders.EditPage, "EditPage");
const ContributePage = lazyImport(routeModuleLoaders.ContributePage, "ContributePage");
const BirthdayPage = lazyImport(routeModuleLoaders.BirthdayPage, "BirthdayPage");
const PreviewPage = lazyImport(routeModuleLoaders.PreviewPage, "PreviewPage");
const ThemeBuilderPage = lazyImport(routeModuleLoaders.ThemeBuilderPage, "ThemeBuilderPage");
const UpgradePage = lazyImport(routeModuleLoaders.UpgradePage, "UpgradePage");
const SettingsPage = lazyImport(routeModuleLoaders.SettingsPage, "SettingsPage");
const AcceptInvitePage = lazyImport(routeModuleLoaders.AcceptInvitePage, "AcceptInvitePage");
const NotFound = lazyImport(routeModuleLoaders.NotFound, "NotFound");
const LegalPage = lazyImport(routeModuleLoaders.LegalPage, "LegalPage");

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
    const routePageId = pathname.split("/").filter(Boolean)[1] || "";

    if (pathname === "/") {
      setTitle("Create collaborative birthday surprises");
      robots.setAttribute("content", "index,follow");
      canonical.setAttribute("href", `${origin}/`);
      upsertMeta('meta[property="og:title"]', "property", "og:title", `Create collaborative birthday surprises | ${APP_NAME}`);
      upsertMeta('meta[property="og:description"]', "property", "og:description", "Create a collaborative birthday page with wishes, photos, and voice notes.");
      upsertMeta('meta[property="og:url"]', "property", "og:url", `${origin}/`);
      upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
      upsertMeta('meta[property="og:image"]', "property", "og:image", `${origin}/api/og-image-app`);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `Create collaborative birthday surprises | ${APP_NAME}`);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Create a collaborative birthday page with wishes, photos, and voice notes.");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${origin}/api/og-image-app`);
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
      upsertMeta('meta[property="og:image"]', "property", "og:image", routePageId ? `${origin}/api/og-image/${routePageId}` : `${origin}/api/og-image-app`);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `Add your birthday wish | ${APP_NAME}`);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Add a wish, photo, or voice note to the birthday story.");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", routePageId ? `${origin}/api/og-image/${routePageId}` : `${origin}/api/og-image-app`);
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
      upsertMeta('meta[property="og:image"]', "property", "og:image", routePageId ? `${origin}/api/og-image/${routePageId}` : `${origin}/api/og-image-app`);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `Happy Birthday! | ${APP_NAME}`);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Open the birthday story: wishes, photos, and voice notes in one replayable link.");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", routePageId ? `${origin}/api/og-image/${routePageId}` : `${origin}/api/og-image-app`);
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

    setTitle(pathname === "/privacy" ? "Privacy Policy" : pathname === "/terms" ? "Terms of Service" : "WishCanvas");
    robots.setAttribute("content", "noindex,nofollow");
    canonical.setAttribute("href", `${origin}${pathname}`);
    upsertMeta('meta[property="og:title"]', "property", "og:title", `${APP_NAME}`);
    upsertMeta('meta[property="og:description"]', "property", "og:description", "Birthday wishes, photos, and voice notes—beautifully delivered.");
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[property="og:image"]', "property", "og:image", `${origin}/api/og-image-app`);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", `${APP_NAME}`);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", "Birthday wishes, photos, and voice notes—beautifully delivered.");
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", `${origin}/api/og-image-app`);
  }, [location.pathname]);

  return null;
};

const RoutePrefetchController = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canPrefetchOnCurrentConnection()) return;

    const pathname = location.pathname;
    const targets: RouteModuleKey[] = [];

    if (pathname === "/") {
      targets.push("AuthPage");
    } else if (pathname === "/auth" || pathname === "/verify-email") {
      targets.push("Dashboard", "CreatePage");
    } else if (pathname === "/dashboard") {
      targets.push("CreatePage", "ThemeBuilderPage", "UpgradePage", "SettingsPage", "AdminPage");
    } else if (pathname.startsWith("/birthday/")) {
      targets.push("ContributePage");
    } else if (pathname.startsWith("/preview/")) {
      targets.push("EditPage");
    }

    if (!targets.length) return;

    const doPrefetch = () => targets.forEach((target) => prefetchRouteModule(target));

    if ("requestIdleCallback" in window) {
      const idleId = (window as Window & { requestIdleCallback: (callback: IdleRequestCallback) => number }).requestIdleCallback(() => {
        doPrefetch();
      });

      return () => {
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = globalThis.setTimeout(doPrefetch, 700);
    return () => globalThis.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canPrefetchOnCurrentConnection()) return;

    const prefetchFromEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let pathname = "";
      try {
        pathname = new URL(anchor.href, window.location.origin).pathname;
      } catch {
        return;
      }

      const moduleKey = moduleKeyFromPathname(pathname);
      if (!moduleKey) return;

      prefetchRouteModule(moduleKey);
    };

    window.addEventListener("pointerover", prefetchFromEvent, { passive: true });
    window.addEventListener("focusin", prefetchFromEvent, { passive: true });
    window.addEventListener("touchstart", prefetchFromEvent, { passive: true });

    return () => {
      window.removeEventListener("pointerover", prefetchFromEvent);
      window.removeEventListener("focusin", prefetchFromEvent);
      window.removeEventListener("touchstart", prefetchFromEvent);
    };
  }, []);

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
          <RoutePrefetchController />
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<Navigate to="/auth?mode=login" replace />} />
              <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
              <Route path="/forgot-password" element={<Navigate to="/auth?mode=forgot" replace />} />
              <Route path="/reset-password" element={<Navigate to="/auth?mode=reset" replace />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/edit/:pageId" element={<EditPage />} />
              <Route path="/contribute/:pageId" element={<ContributePage />} />
              <Route path="/birthday/:pageId" element={<BirthdayPage />} />
              <Route path="/preview/:pageId" element={<PreviewPage />} />
              <Route path="/themes" element={<ThemeBuilderPage />} />
              <Route path="/billing" element={<UpgradePage />} />
              <Route path="/upgrade" element={<Navigate to="/billing" replace />} />
              <Route path="/upgrade/*" element={<Navigate to="/billing" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/organize/:token" element={<AcceptInvitePage />} />
              <Route path="/privacy" element={<LegalPage />} />
              <Route path="/terms" element={<LegalPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
