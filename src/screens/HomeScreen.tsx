import { Settings } from "lucide-react";
import { useState } from "react";
import {
  ActivityRow,
  BalanceHero,
  Loader,
} from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  type Activity,
  useActivity,
  useAllSpends,
  useAllVouchers,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { signOut } from "@/lib/auth";
import {
  netBalance,
  sumSpends,
  sumUnverified,
  sumVerified,
} from "@/lib/balances";

export default function HomeScreen() {
  const { loading } = useAuth();
  const vouchers = useAllVouchers();
  const spends = useAllSpends();
  const recent = useActivity({ limit: 5 });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const verified = sumVerified(vouchers);
  const unverified = sumUnverified(vouchers);
  const spent = sumSpends(spends);
  const net = netBalance(vouchers, spends);

  function jumpToActivity(activity: Activity) {
    const nav = useNavStore.getState();
    if (activity.type.startsWith("voucher.") && activity.routeId) {
      nav.setTab("entry");
      nav.go({ name: "route", params: { routeId: activity.routeId } });
      nav.go({
        name: "voucher-editor",
        params: { routeId: activity.routeId, voucherId: activity.refId },
      });
      return;
    }
    if (activity.type.startsWith("spend.")) {
      nav.setTab("entry");
      nav.go({ name: "spend-editor", params: { spendId: activity.refId } });
      return;
    }
    if (activity.type.startsWith("route.") && activity.routeId) {
      nav.setTab("entry");
      nav.go({ name: "route", params: { routeId: activity.routeId } });
      return;
    }
    // Fallback: jump to the Activity tab.
    nav.setTab("activity");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{ paddingBottom: "calc(var(--tab-bar-height) + var(--tab-safe-bottom))" }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-strong)] bg-[#0a0a0a] font-display text-lg leading-none text-white"
          >
            =
          </span>
          <h1 className="font-display text-xl">Tally</h1>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <Settings size={16} />
        </button>
      </header>

      <BalanceHero
        verified={verified}
        unverified={unverified}
        spent={spent}
        net={net}
      />

      <section className="flex flex-col gap-3 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="eyebrow">02 / RECENT</div>
          <button
            type="button"
            onClick={() => useNavStore.getState().setTab("activity")}
            className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] active:text-[var(--color-text)]"
          >
            View all →
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No activity yet. Add a voucher to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                onTap={() => jumpToActivity(a)}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Settings</DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              Signed in. Tap below to sign out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                void signOut();
              }}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)]"
            >
              Sign out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
