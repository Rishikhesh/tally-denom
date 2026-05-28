import { ChevronRight, Plus } from "lucide-react";
import { Loader, RoutePicker } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { createRoute, useRoutes } from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";

export default function EntryScreen() {
  const { user, loading } = useAuth();
  const routes = useRoutes();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  async function handleCreate(name: string): Promise<string> {
    if (!user) throw new Error("Not signed in");
    return createRoute(user.uid, { name });
  }

  function openRoute(routeId: string) {
    useNavStore.getState().go({ name: "route", params: { routeId } });
  }

  const sortedRoutes = [...routes].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="relative flex h-full flex-col">
      <header className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <h1 className="font-display text-xl">Entry</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col gap-3 px-5 py-5">
          <div className="eyebrow">01 / ROUTE</div>
          <RoutePicker
            routes={routes}
            value={null}
            onChange={(id) => {
              if (id) openRoute(id);
            }}
            onCreate={handleCreate}
          />
        </section>

        <section className="flex flex-col gap-3 px-5 pb-6">
          {routes.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6">
              <div className="eyebrow">00 / EMPTY</div>
              <p className="text-sm text-[var(--color-text-muted)]">
                No routes yet. Create your first route above.
              </p>
            </div>
          ) : (
            <>
              <div className="eyebrow">02 / RECENT ROUTES</div>
              <div className="flex flex-col gap-2">
                {sortedRoutes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openRoute(r.id)}
                    className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 text-left active:bg-[var(--color-surface)]"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-base font-medium text-[var(--color-text)]">
                        {r.name}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                        {r.voucherCount} voucher{r.voucherCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-[var(--color-text-muted)]"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() =>
          useNavStore.getState().go({ name: "spend-editor", params: {} })
        }
        aria-label="Add spend"
        className="absolute bottom-4 right-4 z-20 flex h-12 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] active:translate-y-px"
      >
        <Plus size={18} />
        <span>Spend</span>
      </button>
    </div>
  );
}
