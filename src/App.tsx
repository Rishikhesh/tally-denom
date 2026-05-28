import { lazy, Suspense, useEffect, useState } from "react";
import {
  AppSplash,
  Loader,
  PwaUpdatePrompt,
  TabBar,
  type TabId,
} from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { type NavEntry, useNavStore } from "@/hooks/useNavStore";
import { useTheme } from "@/hooks/useTheme";
import { type PwaUpdateState, subscribeToPwaUpdates } from "@/pwa";

const HomeScreen = lazy(() => import("@/screens/HomeScreen"));
const EntryScreen = lazy(() => import("@/screens/EntryScreen"));
const ActivityScreen = lazy(() => import("@/screens/ActivityScreen"));
const AnalyticsScreen = lazy(() => import("@/screens/AnalyticsScreen"));
const RouteScreen = lazy(() => import("@/screens/RouteScreen"));
const VoucherEditorScreen = lazy(() => import("@/screens/VoucherEditorScreen"));
const SpendEditorScreen = lazy(() => import("@/screens/SpendEditorScreen"));
const SignInScreen = lazy(() => import("@/screens/SignInScreen"));

const FULLSCREEN_STACK_NAMES = new Set(["voucher-editor", "spend-editor"]);

function showTabBar(top: NavEntry | undefined): boolean {
  if (!top) return true;
  return !FULLSCREEN_STACK_NAMES.has(top.name);
}

export default function App() {
  // Apply data-theme to <html> even before sign-in.
  useTheme();

  const { user, loading } = useAuth();
  const tab = useNavStore((s) => s.tab);
  const stack = useNavStore((s) => s.stack);
  const top: NavEntry | undefined = stack[stack.length - 1];

  const [pwaUpdate, setPwaUpdate] = useState<PwaUpdateState>({
    needRefresh: false,
    offlineReady: false,
  });

  useEffect(() => subscribeToPwaUpdates(setPwaUpdate), []);

  if (loading) {
    return (
      <div className="app-shell-wrap">
        <div className="phone-canvas">
          <AppSplash onDone={() => {}} />
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="app-shell-wrap">
        <div className="phone-canvas">
          {pwaUpdate.needRefresh && <PwaUpdatePrompt />}
          <Suspense fallback={<Loader />}>
            <SignInScreen />
          </Suspense>
        </div>
      </div>
    );
  }

  function renderScreen() {
    if (top) {
      switch (top.name) {
        case "route":
          return <RouteScreen />;
        case "voucher-editor":
          return <VoucherEditorScreen />;
        case "spend-editor":
          return <SpendEditorScreen />;
        default:
          break;
      }
    }
    switch (tab) {
      case "home":
        return <HomeScreen />;
      case "entry":
        return <EntryScreen />;
      case "activity":
        return <ActivityScreen />;
      case "analytics":
        return <AnalyticsScreen />;
      default:
        return <HomeScreen />;
    }
  }

  const handleTabChange = (next: TabId) => {
    useNavStore.getState().setTab(next);
  };

  return (
    <div className="app-shell-wrap">
      <div className="phone-canvas">
        {pwaUpdate.needRefresh && <PwaUpdatePrompt />}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom:
              "calc(var(--tab-bar-height) + var(--tab-safe-bottom))",
          }}
        >
          <Suspense fallback={<Loader />}>{renderScreen()}</Suspense>
        </div>
        {showTabBar(top) && (
          <TabBar active={tab} onChange={handleTabChange} />
        )}
      </div>
    </div>
  );
}
