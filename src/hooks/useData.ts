import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  type DocumentData,
  type DocumentReference,
  getDoc,
  getDocs,
  increment,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  type DenomCounts,
  type DenomCountsWire,
  fromWire,
  toWire,
} from "@/lib/denoms";
import { type ActivityType, buildActivity } from "@/lib/activity";
import { useAuth } from "@/hooks/useAuth";

// ── Client-side document types ─────────────────────────────────────────

export interface Route {
  id: string;
  name: string;
  voucherCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Voucher {
  id: string;
  routeId: string;
  /** Auto-generated dummy number assigned at creation. */
  code: string;
  /** Real voucher number entered at verification time. Display prefers this. */
  actualCode: string | null;
  total: number;
  denoms: DenomCounts;
  verified: boolean;
  verifiedAt: number | null;
  /** Counted amount entered at verification. Data-only; not summed anywhere. */
  verifyAmount: number | null;
  txDate: string;
  createdAt: number;
  updatedAt: number;
}

export interface Spend {
  id: string;
  /** New: spends are scoped to a voucher (with denormalised routeId). */
  voucherId: string;
  routeId: string;
  note: string;
  category: string | null;
  amount: number;
  denoms: DenomCounts;
  txDate: string;
  createdAt: number;
}

export interface Fund {
  id: string;
  title: string;
  remark: string | null;
  amount: number;
  denoms: DenomCounts;
  txDate: string;
  createdAt: number;
}

export interface Ledger {
  id: string;
  name: string;
  entryCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface LedgerEntry {
  id: string;
  ledgerId: string;
  kind: "in" | "out";
  title: string;
  amount: number;
  denoms: DenomCounts;
  note: string | null;
  txDate: string;
  createdAt: number;
  updatedAt: number;
}

export interface Exchange {
  id: string;
  amount: number;
  fromDenoms: DenomCounts;
  toDenoms: DenomCounts;
  note: string | null;
  txDate: string;
  createdAt: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  refId: string;
  routeId: string | null;
  title: string;
  amount: number | null;
  txDate: string | null;
  meta: Record<string, unknown>;
  createdAt: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function tsToMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  return 0;
}

function tsToMillisOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  return null;
}

function mapRoute(id: string, d: DocumentData): Route {
  return {
    id,
    name: typeof d.name === "string" ? d.name : "",
    voucherCount: typeof d.voucherCount === "number" ? d.voucherCount : 0,
    createdAt: tsToMillis(d.createdAt),
    updatedAt: tsToMillis(d.updatedAt),
  };
}

function mapVoucher(id: string, d: DocumentData): Voucher {
  return {
    id,
    routeId: typeof d.routeId === "string" ? d.routeId : "",
    code: typeof d.code === "string" ? d.code : "",
    actualCode: typeof d.actualCode === "string" ? d.actualCode : null,
    total: typeof d.total === "number" ? d.total : 0,
    denoms: fromWire(d.denoms as DenomCountsWire),
    verified: d.verified === true,
    verifiedAt: tsToMillisOrNull(d.verifiedAt),
    verifyAmount:
      typeof d.verifyAmount === "number" ? d.verifyAmount : null,
    txDate: typeof d.txDate === "string" ? d.txDate : "",
    createdAt: tsToMillis(d.createdAt),
    updatedAt: tsToMillis(d.updatedAt),
  };
}

function mapSpend(id: string, d: DocumentData): Spend {
  return {
    id,
    voucherId: typeof d.voucherId === "string" ? d.voucherId : "",
    routeId: typeof d.routeId === "string" ? d.routeId : "",
    note: typeof d.note === "string" ? d.note : "",
    category: typeof d.category === "string" ? d.category : null,
    amount: typeof d.amount === "number" ? d.amount : 0,
    denoms: fromWire(d.denoms as DenomCountsWire),
    txDate: typeof d.txDate === "string" ? d.txDate : "",
    createdAt: tsToMillis(d.createdAt),
  };
}

function mapFund(id: string, d: DocumentData): Fund {
  return {
    id,
    title: typeof d.title === "string" ? d.title : "",
    remark: typeof d.remark === "string" ? d.remark : null,
    amount: typeof d.amount === "number" ? d.amount : 0,
    denoms: fromWire(d.denoms as DenomCountsWire),
    txDate: typeof d.txDate === "string" ? d.txDate : "",
    createdAt: tsToMillis(d.createdAt),
  };
}

function mapLedger(id: string, d: DocumentData): Ledger {
  return {
    id,
    name: typeof d.name === "string" ? d.name : "",
    entryCount: typeof d.entryCount === "number" ? d.entryCount : 0,
    createdAt: tsToMillis(d.createdAt),
    updatedAt: tsToMillis(d.updatedAt),
  };
}

function mapLedgerEntry(id: string, d: DocumentData): LedgerEntry {
  const rawKind = typeof d.kind === "string" ? d.kind : "in";
  const kind: "in" | "out" = rawKind === "out" ? "out" : "in";
  return {
    id,
    ledgerId: typeof d.ledgerId === "string" ? d.ledgerId : "",
    kind,
    title: typeof d.title === "string" ? d.title : "",
    amount: typeof d.amount === "number" ? d.amount : 0,
    denoms: fromWire(d.denoms as DenomCountsWire),
    note: typeof d.note === "string" ? d.note : null,
    txDate: typeof d.txDate === "string" ? d.txDate : "",
    createdAt: tsToMillis(d.createdAt),
    updatedAt: tsToMillis(d.updatedAt),
  };
}

function mapExchange(id: string, d: DocumentData): Exchange {
  return {
    id,
    amount: typeof d.amount === "number" ? d.amount : 0,
    fromDenoms: fromWire(d.fromDenoms as DenomCountsWire),
    toDenoms: fromWire(d.toDenoms as DenomCountsWire),
    note: typeof d.note === "string" ? d.note : null,
    txDate: typeof d.txDate === "string" ? d.txDate : "",
    createdAt: tsToMillis(d.createdAt),
  };
}

function mapActivity(id: string, d: DocumentData): Activity {
  return {
    id,
    type: d.type as ActivityType,
    refId: typeof d.refId === "string" ? d.refId : "",
    routeId: typeof d.routeId === "string" ? d.routeId : null,
    title: typeof d.title === "string" ? d.title : "",
    amount: typeof d.amount === "number" ? d.amount : null,
    txDate: typeof d.txDate === "string" ? d.txDate : null,
    meta:
      d.meta && typeof d.meta === "object"
        ? (d.meta as Record<string, unknown>)
        : {},
    createdAt: tsToMillis(d.createdAt),
  };
}

function userScope(uid: string, sub: string) {
  return collection(db, "users", uid, sub);
}

// ── Listener hooks ─────────────────────────────────────────────────────

// A keyed cache: only return rows when the cached uid matches the current uid.
// This lets the listener be the sole source of setState calls (no "reset on
// uid change" inside the effect body, which would trip react-hooks/set-state-in-effect).
interface Keyed<T> {
  uid: string | null;
  rows: T;
}

const emptyArr: never[] = [];

export function useRoutes(): Route[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [keyed, setKeyed] = useState<Keyed<Route[]>>({ uid: null, rows: [] });

  useEffect(() => {
    if (!uid) return;
    const q = query(userScope(uid, "routes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({ uid, rows: snap.docs.map((d) => mapRoute(d.id, d.data())) });
    });
    return unsub;
  }, [uid]);

  return keyed.uid === uid && uid !== null ? keyed.rows : (emptyArr as Route[]);
}

export function useRoute(id: string | null | undefined): Route | null {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const docKey = uid && id ? `${uid}:${id}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; row: Route | null }>(
    { key: null, row: null },
  );

  useEffect(() => {
    if (!uid || !id || !docKey) return;
    const ref = doc(db, "users", uid, "routes", id);
    const unsub = onSnapshot(ref, (snap) => {
      setKeyed({
        key: docKey,
        row: snap.exists() ? mapRoute(snap.id, snap.data()) : null,
      });
    });
    return unsub;
  }, [uid, id, docKey]);

  return keyed.key === docKey ? keyed.row : null;
}

export function useAllVouchers(): Voucher[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [keyed, setKeyed] = useState<Keyed<Voucher[]>>({
    uid: null,
    rows: [],
  });

  useEffect(() => {
    if (!uid) return;
    const q = query(userScope(uid, "vouchers"), orderBy("txDate", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({ uid, rows: snap.docs.map((d) => mapVoucher(d.id, d.data())) });
    });
    return unsub;
  }, [uid]);

  return keyed.uid === uid && uid !== null
    ? keyed.rows
    : (emptyArr as Voucher[]);
}

export function useVouchersByRoute(
  routeId: string | null | undefined,
  range?: { from?: string; to?: string },
): Voucher[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const qKey = uid && routeId ? `${uid}:${routeId}:${from ?? ""}:${to ?? ""}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; rows: Voucher[] }>({
    key: null,
    rows: [],
  });

  useEffect(() => {
    if (!uid || !routeId || !qKey) return;
    const clauses = [where("routeId", "==", routeId)];
    if (from) clauses.push(where("txDate", ">=", from));
    if (to) clauses.push(where("txDate", "<=", to));
    const q = query(
      userScope(uid, "vouchers"),
      ...clauses,
      orderBy("txDate", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapVoucher(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, routeId, from, to, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as Voucher[]);
}

export function useAllSpends(range?: { from?: string; to?: string }): Spend[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const qKey = uid ? `${uid}:${from ?? ""}:${to ?? ""}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; rows: Spend[] }>({
    key: null,
    rows: [],
  });

  useEffect(() => {
    if (!uid || !qKey) return;
    const constraints = [];
    if (from) constraints.push(where("txDate", ">=", from));
    if (to) constraints.push(where("txDate", "<=", to));
    constraints.push(orderBy("txDate", "desc"));
    const q = query(userScope(uid, "spends"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapSpend(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, from, to, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as Spend[]);
}

/** Spends that belong to a specific voucher — used by VoucherDetailScreen. */
export function useSpendsByVoucher(
  voucherId: string | null | undefined,
): Spend[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const qKey = uid && voucherId ? `${uid}:${voucherId}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; rows: Spend[] }>({
    key: null,
    rows: [],
  });

  useEffect(() => {
    if (!uid || !voucherId || !qKey) return;
    const q = query(
      userScope(uid, "spends"),
      where("voucherId", "==", voucherId),
      orderBy("txDate", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapSpend(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, voucherId, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as Spend[]);
}

export function useAllFunds(range?: { from?: string; to?: string }): Fund[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const qKey = uid ? `${uid}:${from ?? ""}:${to ?? ""}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; rows: Fund[] }>({
    key: null,
    rows: [],
  });

  useEffect(() => {
    if (!uid || !qKey) return;
    const constraints = [];
    if (from) constraints.push(where("txDate", ">=", from));
    if (to) constraints.push(where("txDate", "<=", to));
    constraints.push(orderBy("txDate", "desc"));
    const q = query(userScope(uid, "funds"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapFund(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, from, to, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as Fund[]);
}

// ── Ledger listeners ───────────────────────────────────────────────────

export function useLedgers(): Ledger[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [keyed, setKeyed] = useState<Keyed<Ledger[]>>({ uid: null, rows: [] });

  useEffect(() => {
    if (!uid) return;
    const q = query(userScope(uid, "ledgers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        uid,
        rows: snap.docs.map((d) => mapLedger(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid]);

  return keyed.uid === uid && uid !== null
    ? keyed.rows
    : (emptyArr as Ledger[]);
}

export function useLedger(id: string | null | undefined): Ledger | null {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const docKey = uid && id ? `${uid}:${id}` : null;
  const [keyed, setKeyed] = useState<{
    key: string | null;
    row: Ledger | null;
  }>({ key: null, row: null });

  useEffect(() => {
    if (!uid || !id || !docKey) return;
    const ref = doc(db, "users", uid, "ledgers", id);
    const unsub = onSnapshot(ref, (snap) => {
      setKeyed({
        key: docKey,
        row: snap.exists() ? mapLedger(snap.id, snap.data()) : null,
      });
    });
    return unsub;
  }, [uid, id, docKey]);

  return keyed.key === docKey ? keyed.row : null;
}

export function useLedgerEntries(
  ledgerId: string | null | undefined,
  range?: { from?: string; to?: string },
): LedgerEntry[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const qKey =
    uid && ledgerId ? `${uid}:${ledgerId}:${from ?? ""}:${to ?? ""}` : null;
  const [keyed, setKeyed] = useState<{
    key: string | null;
    rows: LedgerEntry[];
  }>({ key: null, rows: [] });

  useEffect(() => {
    if (!uid || !ledgerId || !qKey) return;
    const clauses = [where("ledgerId", "==", ledgerId)];
    if (from) clauses.push(where("txDate", ">=", from));
    if (to) clauses.push(where("txDate", "<=", to));
    const q = query(
      userScope(uid, "ledgerEntries"),
      ...clauses,
      orderBy("txDate", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapLedgerEntry(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, ledgerId, from, to, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as LedgerEntry[]);
}

export function useAllLedgerEntries(range?: {
  from?: string;
  to?: string;
}): LedgerEntry[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const qKey = uid ? `${uid}:${from ?? ""}:${to ?? ""}` : null;
  const [keyed, setKeyed] = useState<{
    key: string | null;
    rows: LedgerEntry[];
  }>({ key: null, rows: [] });

  useEffect(() => {
    if (!uid || !qKey) return;
    const constraints = [];
    if (from) constraints.push(where("txDate", ">=", from));
    if (to) constraints.push(where("txDate", "<=", to));
    constraints.push(orderBy("txDate", "desc"));
    const q = query(userScope(uid, "ledgerEntries"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapLedgerEntry(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, from, to, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as LedgerEntry[]);
}

// ── Exchange listeners ─────────────────────────────────────────────────

export function useAllExchanges(range?: {
  from?: string;
  to?: string;
}): Exchange[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const qKey = uid ? `${uid}:${from ?? ""}:${to ?? ""}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; rows: Exchange[] }>({
    key: null,
    rows: [],
  });

  useEffect(() => {
    if (!uid || !qKey) return;
    const constraints = [];
    if (from) constraints.push(where("txDate", ">=", from));
    if (to) constraints.push(where("txDate", "<=", to));
    constraints.push(orderBy("txDate", "desc"));
    const q = query(userScope(uid, "exchanges"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapExchange(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, from, to, qKey]);

  return keyed.key === qKey ? keyed.rows : (emptyArr as Exchange[]);
}

export interface UseActivityOpts {
  limit?: number;
  types?: ActivityType[];
  from?: string;
  to?: string;
}

export function useActivity(opts?: UseActivityOpts): Activity[] {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Stabilize the `types` array reference so memoized consumers don't churn.
  const typesKey = opts?.types ? opts.types.join(",") : "";
  const limit = opts?.limit ?? null;
  const from = opts?.from ?? null;
  const to = opts?.to ?? null;

  const qKey = uid ? `${uid}:${from ?? ""}:${to ?? ""}:${limit ?? ""}` : null;
  const [keyed, setKeyed] = useState<{ key: string | null; rows: Activity[] }>(
    { key: null, rows: [] },
  );

  useEffect(() => {
    if (!uid || !qKey) return;
    const constraints = [];
    if (from || to) {
      if (from) constraints.push(where("txDate", ">=", from));
      if (to) constraints.push(where("txDate", "<=", to));
      constraints.push(orderBy("txDate", "desc"));
      constraints.push(orderBy("createdAt", "desc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }
    if (limit && limit > 0) constraints.push(qLimit(limit));
    const q = query(userScope(uid, "activities"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setKeyed({
        key: qKey,
        rows: snap.docs.map((d) => mapActivity(d.id, d.data())),
      });
    });
    return unsub;
  }, [uid, from, to, limit, qKey]);

  const rows = keyed.key === qKey ? keyed.rows : (emptyArr as Activity[]);

  return useMemo(() => {
    if (!typesKey) return rows;
    const allow = new Set(typesKey.split(","));
    return rows.filter((r) => allow.has(r.type));
  }, [rows, typesKey]);
}

// ── Paginated activity feed (ActivityScreen) ──────────────────────────
// Loads pages of size `pageSize` (default 50) and exposes a `loadMore`
// callback. Active filters (`from`, `to`, `types`) drive the query and
// resetting them automatically resets the page counter. The Firestore
// listener fetches `pageSize * pages + 1` docs so we can detect whether
// more pages exist without an extra round-trip. Type filtering still
// happens client-side; pagination works on raw docs so the user can keep
// loading more even when the filter is restrictive.

export interface UseActivityPagedOpts {
  pageSize?: number;
  types?: ActivityType[];
  from?: string;
  to?: string;
}

export interface UseActivityPagedResult {
  rows: Activity[];
  hasMore: boolean;
  loadMore: () => void;
  pageSize: number;
  rawCount: number;
}

export function useActivityPaged(
  opts?: UseActivityPagedOpts,
): UseActivityPagedResult {
  const pageSize = opts?.pageSize ?? 50;
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const typesKey = opts?.types ? opts.types.join(",") : "";
  const from = opts?.from ?? null;
  const to = opts?.to ?? null;

  // Filters changing must reset the page counter. We encode the filter set
  // into a key and store it alongside the `pages` count in one piece of
  // state so the reset is atomic (no flicker / double-fetch).
  const filterKey = `${from ?? ""}:${to ?? ""}`;
  const [pagination, setPagination] = useState<{ key: string; pages: number }>(
    { key: filterKey, pages: 1 },
  );
  if (pagination.key !== filterKey) {
    // Derived-state pattern: reset during render when filters change.
    setPagination({ key: filterKey, pages: 1 });
  }
  const pages = pagination.key === filterKey ? pagination.pages : 1;

  const qKey = uid
    ? `${uid}:${filterKey}:${pageSize}:${pages}`
    : null;
  const [keyed, setKeyed] = useState<{
    key: string | null;
    rows: Activity[];
    hasMore: boolean;
  }>({ key: null, rows: [], hasMore: false });

  useEffect(() => {
    if (!uid || !qKey) return;
    const constraints = [];
    if (from || to) {
      if (from) constraints.push(where("txDate", ">=", from));
      if (to) constraints.push(where("txDate", "<=", to));
      constraints.push(orderBy("txDate", "desc"));
      constraints.push(orderBy("createdAt", "desc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }
    // `+1` is the look-ahead probe — if it comes back, more pages exist.
    const fetchLimit = pageSize * pages + 1;
    constraints.push(qLimit(fetchLimit));
    const q = query(userScope(uid, "activities"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs;
      const has = docs.length > pageSize * pages;
      const trimmed = has ? docs.slice(0, pageSize * pages) : docs;
      setKeyed({
        key: qKey,
        rows: trimmed.map((d) => mapActivity(d.id, d.data())),
        hasMore: has,
      });
    });
    return unsub;
  }, [uid, qKey, from, to, pageSize, pages]);

  const matchedKey = keyed.key === qKey;
  const rawRows = matchedKey ? keyed.rows : (emptyArr as Activity[]);
  const hasMore = matchedKey ? keyed.hasMore : false;

  const filtered = useMemo(() => {
    if (!typesKey) return rawRows;
    const allow = new Set(typesKey.split(","));
    return rawRows.filter((r) => allow.has(r.type));
  }, [rawRows, typesKey]);

  const loadMore = useCallback(() => {
    setPagination((p) =>
      p.key === filterKey ? { key: filterKey, pages: p.pages + 1 } : p,
    );
  }, [filterKey]);

  return {
    rows: filtered,
    hasMore,
    loadMore,
    pageSize,
    rawCount: rawRows.length,
  };
}

// ── Mutation helpers ───────────────────────────────────────────────────
// Plain async functions. Each takes a `uid` so the caller passes it from
// `useAuth()`. All mutations write through a `writeBatch` and append an
// activity entry in the same batch.

function routesCol(uid: string) {
  return collection(db, "users", uid, "routes");
}
function vouchersCol(uid: string) {
  return collection(db, "users", uid, "vouchers");
}
function spendsCol(uid: string) {
  return collection(db, "users", uid, "spends");
}
function fundsCol(uid: string) {
  return collection(db, "users", uid, "funds");
}
function ledgersCol(uid: string) {
  return collection(db, "users", uid, "ledgers");
}
function ledgerEntriesCol(uid: string) {
  return collection(db, "users", uid, "ledgerEntries");
}
function exchangesCol(uid: string) {
  return collection(db, "users", uid, "exchanges");
}
function activitiesCol(uid: string) {
  return collection(db, "users", uid, "activities");
}

function newRef(col: ReturnType<typeof collection>): DocumentReference {
  return doc(col);
}

// ── Routes ─────────────────────────────────────────────────────────────

export async function createRoute(
  uid: string,
  input: { name: string },
): Promise<string> {
  const batch = writeBatch(db);
  const ref = newRef(routesCol(uid));
  const now = serverTimestamp();
  batch.set(ref, {
    name: input.name,
    voucherCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "route.create",
      refId: ref.id,
      routeId: ref.id,
      title: `Route "${input.name}" created`,
    }),
    createdAt: now,
  });

  await batch.commit();
  return ref.id;
}

export async function deleteRoute(uid: string, routeId: string): Promise<void> {
  const ref = doc(db, "users", uid, "routes", routeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteRoute: route ${routeId} not found`);
  }
  const data = snap.data();
  const count = typeof data.voucherCount === "number" ? data.voucherCount : 0;
  if (count > 0) {
    throw new Error(
      `Cannot delete route with ${count} voucher${count === 1 ? "" : "s"}`,
    );
  }
  const name = typeof data.name === "string" ? data.name : "";

  const batch = writeBatch(db);
  batch.delete(ref);
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "route.delete",
      refId: routeId,
      routeId,
      title: `Route "${name}" deleted`,
    }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ── Vouchers ───────────────────────────────────────────────────────────

export async function createVoucher(
  uid: string,
  input: {
    routeId: string;
    code: string;
    total: number;
    denoms: DenomCounts;
    txDate: string;
  },
): Promise<string> {
  const batch = writeBatch(db);
  const ref = newRef(vouchersCol(uid));
  const now = serverTimestamp();

  batch.set(ref, {
    routeId: input.routeId,
    code: input.code,
    actualCode: null,
    total: input.total,
    denoms: toWire(input.denoms),
    verified: false,
    verifiedAt: null,
    verifyAmount: null,
    txDate: input.txDate,
    createdAt: now,
    updatedAt: now,
  });

  const routeRef = doc(db, "users", uid, "routes", input.routeId);
  batch.update(routeRef, {
    voucherCount: increment(1),
    updatedAt: now,
  });

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "voucher.create",
      refId: ref.id,
      routeId: input.routeId,
      title: `VCH #${input.code} created`,
      amount: input.total,
      txDate: input.txDate,
    }),
    createdAt: now,
  });

  await batch.commit();
  return ref.id;
}

export async function editVoucher(
  uid: string,
  id: string,
  partial: {
    code?: string;
    total?: number;
    denoms?: DenomCounts;
    txDate?: string;
  },
): Promise<void> {
  const ref = doc(db, "users", uid, "vouchers", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`editVoucher: voucher ${id} not found`);
  }
  const data = snap.data();
  const before = {
    code: typeof data.code === "string" ? data.code : "",
    total: typeof data.total === "number" ? data.total : 0,
    denoms: fromWire(data.denoms as DenomCountsWire),
    txDate: typeof data.txDate === "string" ? data.txDate : "",
  };
  const after = {
    code: partial.code ?? before.code,
    total: partial.total ?? before.total,
    denoms: partial.denoms ?? before.denoms,
    txDate: partial.txDate ?? before.txDate,
  };

  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (partial.code !== undefined) update.code = partial.code;
  if (partial.total !== undefined) update.total = partial.total;
  if (partial.denoms !== undefined) update.denoms = toWire(partial.denoms);
  if (partial.txDate !== undefined) update.txDate = partial.txDate;

  const batch = writeBatch(db);
  batch.update(ref, update);

  const routeId = typeof data.routeId === "string" ? data.routeId : null;
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "voucher.edit",
      refId: id,
      routeId,
      title: `VCH #${after.code} edited`,
      amount: after.total,
      txDate: after.txDate,
      meta: { before, after },
    }),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function verifyVoucher(
  uid: string,
  id: string,
  opts?: { actualCode?: string | null; verifyAmount?: number | null },
): Promise<void> {
  const ref = doc(db, "users", uid, "vouchers", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`verifyVoucher: voucher ${id} not found`);
  }
  const data = snap.data();
  const code = typeof data.code === "string" ? data.code : "";
  const total = typeof data.total === "number" ? data.total : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;
  const routeId = typeof data.routeId === "string" ? data.routeId : null;

  const actualCode =
    opts?.actualCode != null && opts.actualCode.trim()
      ? opts.actualCode.trim()
      : null;
  const verifyAmount =
    typeof opts?.verifyAmount === "number" ? opts.verifyAmount : null;

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.update(ref, {
    verified: true,
    verifiedAt: now,
    actualCode,
    verifyAmount,
    updatedAt: now,
  });
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "voucher.verify",
      refId: id,
      routeId,
      title: `VCH #${actualCode ?? code} verified`,
      amount: total,
      txDate,
      meta: { voucherTotal: total, verifyAmount, actualCode },
    }),
    createdAt: now,
  });
  await batch.commit();
}

export async function unverifyVoucher(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "vouchers", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`unverifyVoucher: voucher ${id} not found`);
  }
  const data = snap.data();
  const code = typeof data.code === "string" ? data.code : "";
  const total = typeof data.total === "number" ? data.total : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;
  const routeId = typeof data.routeId === "string" ? data.routeId : null;

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.update(ref, {
    verified: false,
    verifiedAt: null,
    actualCode: null,
    verifyAmount: null,
    updatedAt: now,
  });
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "voucher.unverify",
      refId: id,
      routeId,
      title: `VCH #${code} unverified`,
      amount: total,
      txDate,
    }),
    createdAt: now,
  });
  await batch.commit();
}

/**
 * Deletes a voucher AND every spend that points at it (cascade). One activity
 * entry records the cascade; per-spend `spend.delete` entries aren't written
 * (would balloon the audit log for vouchers with many spends).
 *
 * Firestore batches cap at 500 writes; we chunk the spend deletes so a
 * pathological voucher with 200+ spends still goes through cleanly.
 */
const BATCH_LIMIT = 400; // safety margin below Firestore's 500-write cap

export async function deleteVoucher(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "vouchers", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteVoucher: voucher ${id} not found`);
  }
  const data = snap.data();
  const code = typeof data.code === "string" ? data.code : "";
  const total = typeof data.total === "number" ? data.total : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;
  const routeId = typeof data.routeId === "string" ? data.routeId : null;

  // Cascade: gather spend ids first, outside the batch.
  const spendQ = query(spendsCol(uid), where("voucherId", "==", id));
  const spendSnap = await getDocs(spendQ);
  const spendRefs = spendSnap.docs.map((d) => d.ref);

  const now = serverTimestamp();

  // Build the FIRST batch: voucher delete + route decrement + activity +
  // as many spend deletes as fit. Subsequent batches just delete spends.
  let batch = writeBatch(db);
  let ops = 0;
  batch.delete(ref);
  ops += 1;

  if (routeId) {
    const routeRef = doc(db, "users", uid, "routes", routeId);
    batch.update(routeRef, {
      voucherCount: increment(-1),
      updatedAt: now,
    });
    ops += 1;
  }

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "voucher.delete",
      refId: id,
      routeId,
      title: `VCH #${code} deleted`,
      amount: total,
      txDate,
      meta: { cascadedSpends: spendRefs.length },
    }),
    createdAt: now,
  });
  ops += 1;

  // Pending batches to commit in order.
  const pending: ReturnType<typeof writeBatch>[] = [];
  for (const sref of spendRefs) {
    if (ops >= BATCH_LIMIT) {
      pending.push(batch);
      batch = writeBatch(db);
      ops = 0;
    }
    batch.delete(sref);
    ops += 1;
  }
  pending.push(batch);

  for (const b of pending) {
    await b.commit();
  }
}

// ── Spends ─────────────────────────────────────────────────────────────

export async function createSpend(
  uid: string,
  input: {
    voucherId: string;
    routeId: string;
    note: string;
    category: string | null;
    amount: number;
    denoms: DenomCounts;
    txDate: string;
  },
): Promise<string> {
  const batch = writeBatch(db);
  const ref = newRef(spendsCol(uid));
  const now = serverTimestamp();

  batch.set(ref, {
    voucherId: input.voucherId,
    routeId: input.routeId,
    note: input.note,
    category: input.category,
    amount: input.amount,
    denoms: toWire(input.denoms),
    txDate: input.txDate,
    createdAt: now,
  });

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "spend.create",
      refId: ref.id,
      routeId: input.routeId,
      title: `Spend ₹${input.amount} – ${input.note}`,
      amount: input.amount,
      txDate: input.txDate,
      meta: { voucherId: input.voucherId },
    }),
    createdAt: now,
  });

  await batch.commit();
  return ref.id;
}

export async function editSpend(
  uid: string,
  id: string,
  partial: {
    note?: string;
    category?: string | null;
    amount?: number;
    denoms?: DenomCounts;
    txDate?: string;
  },
): Promise<void> {
  const ref = doc(db, "users", uid, "spends", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`editSpend: spend ${id} not found`);
  }
  const data = snap.data();
  const before = {
    note: typeof data.note === "string" ? data.note : "",
    category: typeof data.category === "string" ? data.category : null,
    amount: typeof data.amount === "number" ? data.amount : 0,
    denoms: fromWire(data.denoms as DenomCountsWire),
    txDate: typeof data.txDate === "string" ? data.txDate : "",
  };
  const after = {
    note: partial.note ?? before.note,
    category:
      partial.category !== undefined ? partial.category : before.category,
    amount: partial.amount ?? before.amount,
    denoms: partial.denoms ?? before.denoms,
    txDate: partial.txDate ?? before.txDate,
  };

  const update: Record<string, unknown> = {};
  if (partial.note !== undefined) update.note = partial.note;
  if (partial.category !== undefined) update.category = partial.category;
  if (partial.amount !== undefined) update.amount = partial.amount;
  if (partial.denoms !== undefined) update.denoms = toWire(partial.denoms);
  if (partial.txDate !== undefined) update.txDate = partial.txDate;

  const batch = writeBatch(db);
  batch.update(ref, update);

  const routeId = typeof data.routeId === "string" ? data.routeId : null;
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "spend.edit",
      refId: id,
      routeId,
      title: `Spend ₹${after.amount} – ${after.note} edited`,
      amount: after.amount,
      txDate: after.txDate,
      meta: { before, after, voucherId: data.voucherId },
    }),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function deleteSpend(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "spends", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteSpend: spend ${id} not found`);
  }
  const data = snap.data();
  const note = typeof data.note === "string" ? data.note : "";
  const amount = typeof data.amount === "number" ? data.amount : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;
  const routeId = typeof data.routeId === "string" ? data.routeId : null;

  const batch = writeBatch(db);
  batch.delete(ref);
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "spend.delete",
      refId: id,
      routeId,
      title: `Spend ₹${amount} – ${note} deleted`,
      amount,
      txDate,
      meta: { voucherId: data.voucherId },
    }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ── Funds ──────────────────────────────────────────────────────────────

export async function createFund(
  uid: string,
  input: {
    title: string;
    remark: string | null;
    amount: number;
    denoms: DenomCounts;
    txDate: string;
  },
): Promise<string> {
  const batch = writeBatch(db);
  const ref = newRef(fundsCol(uid));
  const now = serverTimestamp();

  batch.set(ref, {
    title: input.title,
    remark: input.remark,
    amount: input.amount,
    denoms: toWire(input.denoms),
    txDate: input.txDate,
    createdAt: now,
  });

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "fund.create",
      refId: ref.id,
      title: `Inflow ₹${input.amount} – ${input.title}`,
      amount: input.amount,
      txDate: input.txDate,
    }),
    createdAt: now,
  });

  await batch.commit();
  return ref.id;
}

export async function editFund(
  uid: string,
  id: string,
  partial: {
    title?: string;
    remark?: string | null;
    amount?: number;
    denoms?: DenomCounts;
    txDate?: string;
  },
): Promise<void> {
  const ref = doc(db, "users", uid, "funds", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`editFund: fund ${id} not found`);
  }
  const data = snap.data();
  const before = {
    title: typeof data.title === "string" ? data.title : "",
    remark: typeof data.remark === "string" ? data.remark : null,
    amount: typeof data.amount === "number" ? data.amount : 0,
    denoms: fromWire(data.denoms as DenomCountsWire),
    txDate: typeof data.txDate === "string" ? data.txDate : "",
  };
  const after = {
    title: partial.title ?? before.title,
    remark: partial.remark !== undefined ? partial.remark : before.remark,
    amount: partial.amount ?? before.amount,
    denoms: partial.denoms ?? before.denoms,
    txDate: partial.txDate ?? before.txDate,
  };

  const update: Record<string, unknown> = {};
  if (partial.title !== undefined) update.title = partial.title;
  if (partial.remark !== undefined) update.remark = partial.remark;
  if (partial.amount !== undefined) update.amount = partial.amount;
  if (partial.denoms !== undefined) update.denoms = toWire(partial.denoms);
  if (partial.txDate !== undefined) update.txDate = partial.txDate;

  const batch = writeBatch(db);
  batch.update(ref, update);

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "fund.edit",
      refId: id,
      title: `Inflow ₹${after.amount} – ${after.title} edited`,
      amount: after.amount,
      txDate: after.txDate,
      meta: { before, after },
    }),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function deleteFund(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "funds", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteFund: fund ${id} not found`);
  }
  const data = snap.data();
  const title = typeof data.title === "string" ? data.title : "";
  const amount = typeof data.amount === "number" ? data.amount : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;

  const batch = writeBatch(db);
  batch.delete(ref);
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "fund.delete",
      refId: id,
      title: `Inflow ₹${amount} – ${title} deleted`,
      amount,
      txDate,
    }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ── Ledgers ────────────────────────────────────────────────────────────

export async function createLedger(
  uid: string,
  input: { name: string },
): Promise<string> {
  const batch = writeBatch(db);
  const ref = newRef(ledgersCol(uid));
  const now = serverTimestamp();
  batch.set(ref, {
    name: input.name,
    entryCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "ledger.create",
      refId: ref.id,
      title: `Ledger "${input.name}" created`,
    }),
    createdAt: now,
  });
  await batch.commit();
  return ref.id;
}

export async function deleteLedger(
  uid: string,
  ledgerId: string,
): Promise<void> {
  const ref = doc(db, "users", uid, "ledgers", ledgerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteLedger: ledger ${ledgerId} not found`);
  }
  const data = snap.data();
  const name = typeof data.name === "string" ? data.name : "";

  // Pull all entries to check net amount. Net must be 0 for the ledger to be
  // deletable when it has history (otherwise we'd be silently dropping
  // money). Cascade-delete the entries in the same batch.
  const entriesSnap = await getDocs(
    query(ledgerEntriesCol(uid), where("ledgerId", "==", ledgerId)),
  );
  let netAmount = 0;
  for (const eDoc of entriesSnap.docs) {
    const d = eDoc.data();
    const amount = typeof d.amount === "number" ? d.amount : 0;
    const kind = d.kind === "out" ? -1 : 1;
    netAmount += amount * kind;
  }
  if (netAmount !== 0) {
    throw new Error(
      `Cannot delete ledger — net balance is ₹${netAmount}. Close it out first.`,
    );
  }

  const batch = writeBatch(db);
  for (const eDoc of entriesSnap.docs) batch.delete(eDoc.ref);
  batch.delete(ref);
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "ledger.delete",
      refId: ledgerId,
      title: `Ledger "${name}" deleted`,
      meta: { cascadedEntries: entriesSnap.size },
    }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ── Ledger entries ─────────────────────────────────────────────────────

export async function createLedgerEntry(
  uid: string,
  input: {
    ledgerId: string;
    kind: "in" | "out";
    title: string;
    amount: number;
    denoms: DenomCounts;
    note: string | null;
    txDate: string;
  },
): Promise<string> {
  // Look up parent ledger for naming in the activity title.
  const ledgerRef = doc(db, "users", uid, "ledgers", input.ledgerId);
  const ledgerSnap = await getDoc(ledgerRef);
  if (!ledgerSnap.exists()) {
    throw new Error(`createLedgerEntry: ledger ${input.ledgerId} not found`);
  }
  const ledgerName =
    typeof ledgerSnap.data().name === "string"
      ? (ledgerSnap.data().name as string)
      : "";

  const batch = writeBatch(db);
  const ref = newRef(ledgerEntriesCol(uid));
  const now = serverTimestamp();

  batch.set(ref, {
    ledgerId: input.ledgerId,
    kind: input.kind,
    title: input.title,
    amount: input.amount,
    denoms: toWire(input.denoms),
    note: input.note,
    txDate: input.txDate,
    createdAt: now,
    updatedAt: now,
  });

  batch.update(ledgerRef, {
    entryCount: increment(1),
    updatedAt: now,
  });

  const activityType: ActivityType =
    input.kind === "in" ? "ledger-entry.in" : "ledger-entry.out";

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: activityType,
      refId: ref.id,
      title: `Ledger ₹${input.amount} ${input.kind} – ${input.title}`,
      amount: input.amount,
      txDate: input.txDate,
      meta: { ledgerId: input.ledgerId, ledgerName, kind: input.kind },
    }),
    createdAt: now,
  });

  await batch.commit();
  return ref.id;
}

export async function editLedgerEntry(
  uid: string,
  id: string,
  partial: {
    kind?: "in" | "out";
    title?: string;
    amount?: number;
    denoms?: DenomCounts;
    note?: string | null;
    txDate?: string;
  },
): Promise<void> {
  const ref = doc(db, "users", uid, "ledgerEntries", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`editLedgerEntry: entry ${id} not found`);
  }
  const data = snap.data();
  const before = {
    kind: data.kind === "out" ? "out" : "in",
    title: typeof data.title === "string" ? data.title : "",
    amount: typeof data.amount === "number" ? data.amount : 0,
    denoms: fromWire(data.denoms as DenomCountsWire),
    note: typeof data.note === "string" ? data.note : null,
    txDate: typeof data.txDate === "string" ? data.txDate : "",
  };
  const after = {
    kind: partial.kind ?? before.kind,
    title: partial.title ?? before.title,
    amount: partial.amount ?? before.amount,
    denoms: partial.denoms ?? before.denoms,
    note: partial.note !== undefined ? partial.note : before.note,
    txDate: partial.txDate ?? before.txDate,
  };

  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (partial.kind !== undefined) update.kind = partial.kind;
  if (partial.title !== undefined) update.title = partial.title;
  if (partial.amount !== undefined) update.amount = partial.amount;
  if (partial.denoms !== undefined) update.denoms = toWire(partial.denoms);
  if (partial.note !== undefined) update.note = partial.note;
  if (partial.txDate !== undefined) update.txDate = partial.txDate;

  const batch = writeBatch(db);
  batch.update(ref, update);

  const ledgerId = typeof data.ledgerId === "string" ? data.ledgerId : null;
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "ledger-entry.edit",
      refId: id,
      title: `Ledger ₹${after.amount} ${after.kind} edited`,
      amount: after.amount,
      txDate: after.txDate,
      meta: { before, after, ledgerId },
    }),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function deleteLedgerEntry(
  uid: string,
  id: string,
): Promise<void> {
  const ref = doc(db, "users", uid, "ledgerEntries", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteLedgerEntry: entry ${id} not found`);
  }
  const data = snap.data();
  const ledgerId = typeof data.ledgerId === "string" ? data.ledgerId : null;
  const kind = data.kind === "out" ? "out" : "in";
  const amount = typeof data.amount === "number" ? data.amount : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.delete(ref);

  if (ledgerId) {
    const ledgerRef = doc(db, "users", uid, "ledgers", ledgerId);
    batch.update(ledgerRef, {
      entryCount: increment(-1),
      updatedAt: now,
    });
  }

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "ledger-entry.delete",
      refId: id,
      title: `Ledger ₹${amount} ${kind} deleted`,
      amount,
      txDate,
      meta: { ledgerId, kind },
    }),
    createdAt: now,
  });

  await batch.commit();
}

// ── Exchanges ──────────────────────────────────────────────────────────

export async function createExchange(
  uid: string,
  input: {
    amount: number;
    fromDenoms: DenomCounts;
    toDenoms: DenomCounts;
    note: string | null;
    txDate: string;
  },
): Promise<string> {
  const batch = writeBatch(db);
  const ref = newRef(exchangesCol(uid));
  const now = serverTimestamp();

  batch.set(ref, {
    amount: input.amount,
    fromDenoms: toWire(input.fromDenoms),
    toDenoms: toWire(input.toDenoms),
    note: input.note,
    txDate: input.txDate,
    createdAt: now,
  });

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "exchange.create",
      refId: ref.id,
      title: `Exchange ₹${input.amount}`,
      amount: input.amount,
      txDate: input.txDate,
    }),
    createdAt: now,
  });

  await batch.commit();
  return ref.id;
}

export async function deleteExchange(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "exchanges", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`deleteExchange: exchange ${id} not found`);
  }
  const data = snap.data();
  const amount = typeof data.amount === "number" ? data.amount : 0;
  const txDate = typeof data.txDate === "string" ? data.txDate : null;

  const batch = writeBatch(db);
  batch.delete(ref);
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "exchange.delete",
      refId: id,
      title: `Exchange ₹${amount} deleted`,
      amount,
      txDate,
    }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
