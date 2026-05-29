import {
  Check,
  ChevronLeft,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DenomTally, Loader, SpendRow } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DENOMS, type DenomCounts, emptyDenoms } from "@/lib/denoms";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteSpend,
  deleteVoucher,
  unverifyVoucher,
  useAllVouchers,
  useSpendsByVoucher,
  verifyVoucher,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate } from "@/lib/date";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VoucherDetailScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const routeId =
    top && top.params
      ? (top.params.routeId as string | undefined) ?? null
      : null;
  const voucherId =
    top && top.params
      ? (top.params.voucherId as string | undefined) ?? null
      : null;

  const vouchers = useAllVouchers();
  const voucher = useMemo(
    () => vouchers.find((v) => v.id === voucherId) ?? null,
    [vouchers, voucherId],
  );
  const spends = useSpendsByVoucher(voucherId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUnverify, setConfirmUnverify] = useState(false);

  const spentTotal = useMemo(
    () => spends.reduce((a, s) => a + s.amount, 0),
    [spends],
  );
  // Net balance = collected total − spent. Single figure shown for the voucher.
  const netAmount = voucher ? voucher.total - spentTotal : 0;
  const netDenoms = useMemo<DenomCounts>(() => {
    const out = emptyDenoms();
    if (!voucher) return out;
    for (const d of DENOMS) out[d] = voucher.denoms[d];
    for (const s of spends) for (const d of DENOMS) out[d] -= s.denoms[d];
    return out;
  }, [voucher, spends]);

  function goBack() {
    useNavStore.getState().goBack();
  }

  function openSpendEditor(spendId?: string) {
    if (!routeId || !voucherId) return;
    useNavStore.getState().go({
      name: "spend-editor",
      params: {
        routeId,
        voucherId,
        ...(spendId ? { spendId } : {}),
      },
    });
  }

  function onDeleteSpend(id: string) {
    if (!user) return;
    void deleteSpend(user.uid, id);
  }

  function openEditor() {
    if (!routeId || !voucherId) return;
    useNavStore.getState().go({
      name: "voucher-editor",
      params: { routeId, voucherId },
    });
  }
  function doVerify() {
    if (!user || !voucherId) return;
    void verifyVoucher(user.uid, voucherId);
  }
  function doUnverify() {
    if (!user || !voucherId) return;
    void unverifyVoucher(user.uid, voucherId);
  }
  function doDelete() {
    if (!user || !voucherId) return;
    void deleteVoucher(user.uid, voucherId);
    useNavStore.getState().goBack();
  }

  if (loading || !voucherId || !routeId || !voucher) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const verified = voucher.verified;

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate font-display text-lg">
            VCH #{voucher.code}
          </h1>
          {verified && (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              aria-label="Verified (locked)"
              title="Verified records are read-only"
            >
              <Lock size={12} />
            </span>
          )}
        </div>
      </header>

      {/* Hero block — single net balance (collected − spent). */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">VOUCHER BALANCE</span>
          <span
            className={
              netAmount < 0
                ? "break-words font-display text-[32px] font-medium leading-[1.05] tracking-tight tabular-nums text-[var(--color-destructive)]"
                : "break-words font-display text-[32px] font-medium leading-[1.05] tracking-tight tabular-nums text-[var(--color-text)]"
            }
          >
            ₹ {formatINR(netAmount)}
          </span>
          {spentTotal > 0 && (
            <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
              ₹{formatINR(voucher.total)} collected − ₹{formatINR(spentTotal)}{" "}
              spent
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {verified ? (
            <span className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-ink)]">
              VERIFIED
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]">
              UNVERIFIED
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
            {formatDate(voucher.txDate)}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <DenomTally
            counts={netDenoms}
            emphasis={
              DENOMS.some((d) => netDenoms[d] < 0) ? "destructive" : "default"
            }
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {verified ? (
            <button
              type="button"
              onClick={() => setConfirmUnverify(true)}
              className="flex h-9 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
            >
              <RotateCcw size={14} />
              Unverify
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={doVerify}
                className="flex h-9 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] active:opacity-80"
              >
                <Check size={14} />
                Verify
              </button>
              <button
                type="button"
                onClick={openEditor}
                className="flex h-9 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <Pencil size={14} />
                Edit
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-9 items-center gap-1.5 border border-[var(--color-destructive)] bg-[var(--color-bg)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-destructive)] active:bg-[var(--color-surface)]"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable: spends */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="eyebrow mb-2">02 / SPENDS</div>
        {spends.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {verified
                ? "No spends on this voucher."
                : "No spends for this voucher yet. Tap + to add one."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-20">
            {spends.map((s) =>
              verified ? (
                // Verified voucher = view only. Spends shown read-only.
                <SpendRow key={s.id} spend={s} />
              ) : (
                <SpendRow
                  key={s.id}
                  spend={s}
                  onEdit={() => openSpendEditor(s.id)}
                  onDelete={() => onDeleteSpend(s.id)}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Spend FAB only on unverified vouchers — verified is view-only. */}
      {!verified && (
        <button
          type="button"
          onClick={() => openSpendEditor()}
          aria-label="Add spend"
          className="absolute bottom-4 right-4 z-20 flex h-12 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] active:translate-y-px"
        >
          <Plus size={18} />
          <span>Spend</span>
        </button>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete voucher?</DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              VCH #{voucher.code} · ₹{formatINR(voucher.total)} and its{" "}
              {spends.length} spend{spends.length === 1 ? "" : "s"} will be
              removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                doDelete();
              }}
              className="h-10 border border-[var(--color-destructive)] bg-[var(--color-destructive)] px-4 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmUnverify} onOpenChange={setConfirmUnverify}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Mark as unverified?
            </DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              VCH #{voucher.code} · ₹{formatINR(voucher.total)}. It returns to
              the unverified list and can be edited again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmUnverify(false)}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmUnverify(false);
                doUnverify();
              }}
              className="flex h-10 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)]"
            >
              <RotateCcw size={14} />
              Mark unverified
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
