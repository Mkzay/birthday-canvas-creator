const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `const lazyImport = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name: string
) => {
  return lazy(async () => {
    try {
      const component = await factory();
      window.sessionStorage.removeItem(\`vite-chunk-reload-\${name}\`);
      return component;
    } catch (error: any) {
      const key = \`vite-chunk-reload-\${name}\`;
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
const NotFound = lazyImport(() => import("./pages/NotFound"), "NotFound");`;

const regex = /const Index = lazy[^\n]+\r?\n(?:const [a-zA-Z]+ = lazy[^\n]+\r?\n)+const NotFound = lazy[^\n]+/;
code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
