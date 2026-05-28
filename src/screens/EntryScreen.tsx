import { ChevronRight } from "lucide-react";
import { Loader, RoutePicker } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { createRoute, useRoutes } from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";

export default function EntryScreen() {
  const { user, loading } = useAuth();
  const routes = useRoutes();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
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
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{ paddingBottom: "calc(var(--tab-bar-height) + var(--tab-safe-bottom))" }}
    >
      <header className="sticky top-0 z-10 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <h1 className="font-display text-xl">Entry</h1>
      </header>

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
  );
}
