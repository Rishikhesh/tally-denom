import { lazy, Suspense, useEffect, useState } from "react";
import {
  AppSplash,
  Loader,
  PwaUpdatePrompt,
  TabBar,
  type TabId,
} from "@/components";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAuth } from "@/hooks/useAuth";
import { type NavEntry, useNavStore } from "@/hooks/useNavStore";
import { useTheme } from "@/hooks/useTheme";
import { type PwaUpdateState, subscribeToPwaUpdates } from "@/pwa";

const HomeScreen = lazy(() => import("@/screens/HomeScreen"));
const EntryScreen = lazy(() => import("@/screens/EntryScreen"));
const ActivityScreen = lazy(() => import("@/screens/ActivityScreen"));
const RecordsScreen = lazy(() => import("@/screens/RecordsScreen"));
const RouteScreen = lazy(() => import("@/screens/RouteScreen"));
const VoucherEditorScreen = lazy(() => import("@/screens/VoucherEditorScreen"));
const VoucherDetailScreen = lazy(() => import("@/screens/VoucherDetailScreen"));
const SpendEditorScreen = lazy(() => import("@/screens/SpendEditorScreen"));
const LedgerScreen = lazy(() => import("@/screens/LedgerScreen"));
const LedgerDetailScreen = lazy(() => import("@/screens/LedgerDetailScreen"));
const LedgerEntryEditorScreen = lazy(
  () => import("@/screens/LedgerEntryEditorScreen"),
);
const LedgerEntryDetailScreen = lazy(
  () => import("@/screens/LedgerEntryDetailScreen"),
);
const ExchangeEditorScreen = lazy(
  () => import("@/screens/ExchangeEditorScreen"),
);
const SignInScreen = lazy(() => import("@/screens/SignInScreen"));

const FULLSCREEN_STACK_NAMES = new Set([
  "voucher-editor",
  "spend-editor",
  "ledger-entry-editor",
  "exchange-editor",
]);

function showTabBar(top: NavEntry | undefined): boolean {
  if (!top) return true;
  return !FULLSCREEN_STACK_NAMES.has(top.name);
}

export default function App() {
  // Apply data-theme to <html> even before sign-in.
  useTheme();

  const { user, loading } = useAuth();
  const isAdmin = useAdminStore((s) => s.isAdmin);
  const tab = useNavStore((s) => s.tab);
  const stack = useNavStore((s) => s.stack);
  const top: NavEntry | undefined = stack[stack.length - 1];

  // Non-admins live on the Entry tab — snap back if an admin tab is somehow
  // active (e.g. admin mode was just disabled).
  useEffect(() => {
    if (!isAdmin && tab !== "entry") {
      useNavStore.getState().setTab("entry");
    }
  }, [isAdmin, tab]);

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
          <div className="relative flex-1 overflow-hidden">
            <Suspense fallback={<Loader />}>
              <SignInScreen />
            </Suspense>
          </div>
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
        case "voucher-detail":
          return <VoucherDetailScreen />;
        case "spend-editor":
          return <SpendEditorScreen />;
        case "ledger-detail":
          return <LedgerDetailScreen />;
        case "ledger-entry-editor":
          return <LedgerEntryEditorScreen />;
        case "ledger-entry-detail":
          return <LedgerEntryDetailScreen />;
        case "exchange-editor":
          return <ExchangeEditorScreen />;
        case "activity":
          return <ActivityScreen />;
        default:
          break;
      }
    }
    // Non-admins only ever see the Entry tab at the base of the stack.
    if (!isAdmin) return <EntryScreen />;
    switch (tab) {
      case "home":
        return <HomeScreen />;
      case "entry":
        return <EntryScreen />;
      case "ledger":
        return <LedgerScreen />;
      case "records":
        return <RecordsScreen />;
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
          className="relative flex-1 overflow-hidden"
          style={
            showTabBar(top)
              ? {
                  paddingBottom:
                    "calc(var(--tab-bar-height) + var(--tab-safe-bottom))",
                }
              : undefined
          }
        >
          <Suspense fallback={<Loader />}>{renderScreen()}</Suspense>
        </div>
        {showTabBar(top) && (
          <TabBar active={tab} onChange={handleTabChange} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
