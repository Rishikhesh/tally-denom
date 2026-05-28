import { useMemo } from "react";
import { Loader } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { useAllSpends, useAllVouchers } from "@/hooks/useData";
import { denomInventory } from "@/lib/balances";
import { addDaysInput, dateRangePresets, formatDate } from "@/lib/date";
import { DENOMS } from "@/lib/denoms";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <section className="flex flex-col gap-3 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 py-4">
      <div className="eyebrow">{title}</div>
      {children}
    </section>
  );
}

export default function AnalyticsScreen() {
  const { loading } = useAuth();
  const vouchers = useAllVouchers();
  const spends = useAllSpends();

  const { last30 } = useMemo(() => dateRangePresets(), []);

  const v30 = useMemo(
    () => vouchers.filter((v) => v.txDate >= last30.from && v.txDate <= last30.to),
    [vouchers, last30],
  );
  const s30 = useMemo(
    () => spends.filter((s) => s.txDate >= last30.from && s.txDate <= last30.to),
    [spends, last30],
  );

  const verifiedSum = useMemo(
    () => v30.filter((v) => v.verified).reduce((a, v) => a + v.total, 0),
    [v30],
  );
  const unverifiedSum = useMemo(
    () => v30.filter((v) => !v.verified).reduce((a, v) => a + v.total, 0),
    [v30],
  );

  const inventory = useMemo(() => {
    const vStubs = vouchers.map((v) => ({
      total: v.total,
      denoms: v.denoms,
      verified: v.verified,
      routeId: v.routeId,
    }));
    const sStubs = spends.map((s) => ({ amount: s.amount, denoms: s.denoms }));
    return denomInventory(vStubs, sStubs);
  }, [vouchers, spends]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of s30) {
      const k = s.category && s.category.trim() ? s.category : "Uncategorized";
      map.set(k, (map.get(k) ?? 0) + s.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [s30]);

  const dailyBuckets = useMemo(() => {
    // 30 day buckets, inclusive — index 0 = last30.from, index 29 = today.
    const days: { date: string; total: number }[] = [];
    for (let i = 0; i < 30; i++) {
      days.push({ date: addDaysInput(last30.from, i), total: 0 });
    }
    const index = new Map(days.map((d, i) => [d.date, i]));
    for (const v of v30) {
      const i = index.get(v.txDate);
      if (i != null) days[i].total += v.total;
    }
    return days;
  }, [v30, last30]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Geometry shared between charts.
  const W = 320;
  const H = 90;

  // --- 1. VERIFIED vs UNVERIFIED ---
  const maxV = Math.max(verifiedSum, unverifiedSum, 1);
  const barH = 22;

  // --- 2. DENOM DISTRIBUTION ---
  const denomMax = Math.max(
    ...DENOMS.map((d) => Math.abs(inventory[d])),
    1,
  );
  const denomBarW = W / DENOMS.length - 4;
  const denomHalfH = H / 2 - 4;

  // --- 3. SPEND BY CATEGORY ---
  const catMax = Math.max(...categoryTotals.map(([, v]) => v), 1);

  // --- 4. COLLECTION OVER TIME ---
  const maxDaily = Math.max(...dailyBuckets.map((d) => d.total), 1);
  const linePath = dailyBuckets
    .map((d, i) => {
      const x = (i / (dailyBuckets.length - 1)) * W;
      const y = H - (d.total / maxDaily) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const empty30 = v30.length === 0 && s30.length === 0;

  return (
    <div
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4"
      style={{ paddingBottom: "calc(var(--tab-bar-height) + var(--tab-safe-bottom) + 16px)" }}
    >
      <header className="px-1">
        <div className="eyebrow">02 / ANALYTICS</div>
        <h1 className="font-display text-xl">Analytics</h1>
      </header>

      <Card title="01 / VERIFIED vs UNVERIFIED (30d)">
        {v30.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            No data yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="eyebrow">VERIFIED</span>
                <span className="font-mono text-base tabular-nums">
                  ₹{formatINR(verifiedSum)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="eyebrow">UNVERIFIED</span>
                <span className="font-mono text-base tabular-nums">
                  ₹{formatINR(unverifiedSum)}
                </span>
              </div>
            </div>
            <svg
              role="img"
              aria-label="Verified vs unverified collected"
              viewBox={`0 0 ${W} ${barH * 2 + 8}`}
              className="w-full"
            >
              <rect
                x={0}
                y={0}
                width={(verifiedSum / maxV) * W}
                height={barH}
                fill="var(--color-accent)"
              />
              <rect
                x={0}
                y={barH + 8}
                width={(unverifiedSum / maxV) * W}
                height={barH}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
            </svg>
          </div>
        )}
      </Card>

      <Card title="02 / DENOM DISTRIBUTION">
        {empty30 && DENOMS.every((d) => inventory[d] === 0) ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            No data yet.
          </div>
        ) : (
          <svg
            role="img"
            aria-label="Denomination distribution"
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
          >
            <line
              x1={0}
              x2={W}
              y1={H / 2}
              y2={H / 2}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            {DENOMS.map((d, i) => {
              const count = inventory[d];
              const ratio = Math.abs(count) / denomMax;
              const h = ratio * denomHalfH;
              const x = i * (W / DENOMS.length) + 2;
              const baseline = H / 2;
              const negative = count < 0;
              return (
                <g key={d}>
                  <rect
                    x={x}
                    y={negative ? baseline : baseline - h}
                    width={denomBarW}
                    height={h}
                    fill={
                      negative
                        ? "var(--color-destructive)"
                        : "var(--color-accent)"
                    }
                  />
                  <text
                    x={x + denomBarW / 2}
                    y={H - 1}
                    fontSize={8}
                    textAnchor="middle"
                    fill="var(--color-text-muted)"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {d}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </Card>

      <Card title="03 / SPEND BY CATEGORY (30d)">
        {categoryTotals.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            No data yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categoryTotals.map(([cat, sum]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="w-24 truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text)]">
                  {cat}
                </span>
                <div className="relative h-3 flex-1 border border-[var(--color-border)] bg-[var(--color-bg)]">
                  <div
                    className="absolute inset-y-0 left-0 bg-[var(--color-accent)]"
                    style={{ width: `${(sum / catMax) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs tabular-nums text-[var(--color-text)]">
                  ₹{formatINR(sum)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="04 / COLLECTION OVER TIME (30d)">
        {v30.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            No data yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <svg
              role="img"
              aria-label="Collection over time"
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              preserveAspectRatio="none"
            >
              <path
                d={linePath}
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="none"
              />
              <text
                x={W - 2}
                y={10}
                fontSize={8}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontFamily="JetBrains Mono, monospace"
              >
                max ₹{formatINR(maxDaily)}
              </text>
            </svg>
            <div className="flex justify-between font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
              <span>{formatDate(dailyBuckets[0].date)}</span>
              <span>
                {formatDate(dailyBuckets[dailyBuckets.length - 1].date)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
