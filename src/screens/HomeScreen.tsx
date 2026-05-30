import { ArrowLeftRight, Bell, Moon, Settings, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ActivityRow,
  BalanceHero,
  ExchangeDetailSheet,
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
  deleteExchange,
  type Exchange,
  useActivity,
  useAllExchanges,
  useAllLedgerEntries,
  useAllSpends,
  useAllVouchers,
  useLedgers,
  useRoutes,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { useTheme } from "@/hooks/useTheme";
import { signOut } from "@/lib/auth";
import {
  denomInventory,
  netBalance,
  sumLedgerDenoms,
  sumLedgerIn,
  sumLedgerOut,
  sumSpendDenoms,
  sumSpends,
  sumUnverified,
  sumVerified,
  sumVoucherDenoms,
} from "@/lib/balances";

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const vouchers = useAllVouchers();
  const spends = useAllSpends();
  const ledgerEntries = useAllLedgerEntries();
  const exchanges = useAllExchanges();
  const routes = useRoutes();
  const ledgers = useLedgers();
  const recent = useActivity({ limit: 20 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeExchange, setActiveExchange] = useState<Exchange | null>(null);
  const { theme, toggleTheme } = useTheme();

  const verified = sumVerified(vouchers);
  const unverified = sumUnverified(vouchers);
  const ledger = sumLedgerIn(ledgerEntries) - sumLedgerOut(ledgerEntries);
  const spent = sumSpends(spends);
  // Exchanges contribute 0 to net by rule; no need to pass through.
  const net = netBalance(vouchers, spends, [], ledgerEntries);

  // Per-bucket denom maps for the hero.
  const verifiedDenoms = useMemo(
    () => sumVoucherDenoms(vouchers.filter((v) => v.verified)),
    [vouchers],
  );
  const unverifiedDenoms = useMemo(
    () => sumVoucherDenoms(vouchers.filter((v) => !v.verified)),
    [vouchers],
  );
  const ledgerDenoms = useMemo(
    () => sumLedgerDenoms(ledgerEntries),
    [ledgerEntries],
  );
  const spentDenoms = useMemo(() => sumSpendDenoms(spends), [spends]);
  const netDenoms = useMemo(
    () => denomInventory(vouchers, spends, [], ledgerEntries, exchanges),
    [vouchers, spends, ledgerEntries, exchanges],
  );

  // Lookup maps used to surface a context label on each activity row.
  const routeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) m.set(r.id, r.name);
    return m;
  }, [routes]);
  const voucherCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vouchers) m.set(v.id, v.actualCode ?? v.code);
    return m;
  }, [vouchers]);
  const ledgerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of ledgers) m.set(l.id, l.name);
    return m;
  }, [ledgers]);

  // Map voucher id → live display code (real number once verified, else dummy
  // ref). Activity titles froze the code at create time — override with this.
  const voucherDisplayMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vouchers) m.set(v.id, v.actualCode ?? v.code);
    return m;
  }, [vouchers]);
  function titleOverrideFor(a: Activity): string | undefined {
    if (!a.type.startsWith("voucher.")) return undefined;
    const code = voucherDisplayMap.get(a.refId);
    return code ? `VCH #${code}` : undefined;
  }

  function contextLabelFor(a: Activity): string | undefined {
    if (a.type.startsWith("voucher.") || a.type.startsWith("route.")) {
      return a.routeId ? routeNameMap.get(a.routeId) : undefined;
    }
    if (a.type.startsWith("spend.")) {
      const vid =
        typeof a.meta?.voucherId === "string"
          ? (a.meta.voucherId as string)
          : null;
      const code = vid ? voucherCodeMap.get(vid) : undefined;
      const route = a.routeId ? routeNameMap.get(a.routeId) : undefined;
      const parts = [code ? `VCH #${code}` : null, route].filter(
        (x): x is string => !!x,
      );
      return parts.length ? parts.join(" · ") : undefined;
    }
    if (a.type.startsWith("ledger")) {
      const lid =
        typeof a.meta?.ledgerId === "string"
          ? (a.meta.ledgerId as string)
          : null;
      return lid ? ledgerNameMap.get(lid) : undefined;
    }
    return undefined;
  }

  // Hide verify/unverify rows (state surfaced via the VERIFY button) plus
  // route.create / route.delete (not interesting on the home recent strip).
  // Cap at 5 visible.
  const visibleRecent = useMemo(
    () =>
      recent
        .filter(
          (a) =>
            a.type !== "voucher.unverify" &&
            a.type !== "route.create" &&
            a.type !== "route.delete" &&
            !a.type.startsWith("fund."),
        )
        .slice(0, 5),
    [recent],
  );

  function jumpToActivity(activity: Activity) {
    // Push the target screen onto the CURRENT tab's stack — don't switch
    // tabs. That way the back arrow returns to where the user tapped from,
    // matching browser-back expectations.
    const nav = useNavStore.getState();
    if (activity.type.startsWith("voucher.") && activity.routeId) {
      nav.go({
        name: "voucher-detail",
        params: { routeId: activity.routeId, voucherId: activity.refId },
      });
      return;
    }
    if (activity.type.startsWith("spend.")) {
      const vid =
        typeof activity.meta?.voucherId === "string"
          ? (activity.meta.voucherId as string)
          : null;
      if (vid && activity.routeId) {
        nav.go({
          name: "voucher-detail",
          params: { routeId: activity.routeId, voucherId: vid },
        });
      }
      return;
    }
    if (activity.type.startsWith("route.") && activity.routeId) {
      nav.go({ name: "route", params: { routeId: activity.routeId } });
      return;
    }
    if (activity.type === "ledger.create") {
      nav.go({ name: "ledger-detail", params: { ledgerId: activity.refId } });
      return;
    }
    if (activity.type.startsWith("ledger-entry.")) {
      const ledgerId =
        typeof activity.meta?.ledgerId === "string"
          ? (activity.meta.ledgerId as string)
          : null;
      if (ledgerId) {
        nav.go({
          name: "ledger-entry-detail",
          params: { ledgerId, entryId: activity.refId },
        });
      }
      return;
    }
    if (activity.type === "exchange.create") {
      const ex = exchanges.find((x) => x.id === activity.refId) ?? null;
      if (ex) setActiveExchange(ex);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border-strong)] bg-[#0a0a0a] font-display text-lg leading-none text-white"
          >
            =
          </span>
          <h1 className="font-display text-xl">Tally</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              useNavStore.getState().go({ name: "activity" })
            }
            aria-label="Activity"
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
          >
            <Bell size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <BalanceHero
          verified={verified}
          unverified={unverified}
          ledger={ledger}
          spent={spent}
          net={net}
          verifiedDenoms={verifiedDenoms}
          unverifiedDenoms={unverifiedDenoms}
          ledgerDenoms={ledgerDenoms}
          spentDenoms={spentDenoms}
          netDenoms={netDenoms}
        />

        <section className="flex flex-col gap-3 px-5 py-3 pb-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">02 / RECENT</div>
            <button
              type="button"
              onClick={() =>
                useNavStore.getState().go({ name: "activity" })
              }
              className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)] active:text-[var(--color-text)]"
            >
              View all →
            </button>
          </div>

          {visibleRecent.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6">
              <div className="eyebrow">00 / EMPTY</div>
              <p className="text-sm text-[var(--color-text-muted)]">
                No activity yet. Add a voucher to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleRecent.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  onTap={() => jumpToActivity(a)}
                  contextLabel={contextLabelFor(a)}
                  titleOverride={titleOverrideFor(a)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() =>
          useNavStore
            .getState()
            .go({ name: "exchange-editor", params: {} })
        }
        aria-label="Exchange"
        className="absolute bottom-4 right-4 z-20 flex h-12 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] active:translate-y-px"
      >
        <ArrowLeftRight size={18} />
        <span>Exchange</span>
      </button>

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
          <div className="flex items-center justify-between border-t border-b border-[var(--color-border)] py-3">
            <div>
              <div className="eyebrow">THEME</div>
              <div className="text-sm">
                {theme === "dark" ? "Dark" : "Light"}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-10 w-10 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
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

      {activeExchange && (
        <ExchangeDetailSheet
          exchange={activeExchange}
          onClose={() => setActiveExchange(null)}
          onDelete={
            user
              ? () => {
                  void deleteExchange(user.uid, activeExchange.id);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
