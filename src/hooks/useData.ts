import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  type DocumentData,
  type DocumentReference,
  getDoc,
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
  code: string;
  total: number;
  denoms: DenomCounts;
  verified: boolean;
  verifiedAt: number | null;
  txDate: string;
  createdAt: number;
  updatedAt: number;
}

export interface Spend {
  id: string;
  note: string;
  category: string | null;
  amount: number;
  denoms: DenomCounts;
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
    total: typeof d.total === "number" ? d.total : 0,
    denoms: fromWire(d.denoms as DenomCountsWire),
    verified: d.verified === true,
    verifiedAt: tsToMillisOrNull(d.verifiedAt),
    txDate: typeof d.txDate === "string" ? d.txDate : "",
    createdAt: tsToMillis(d.createdAt),
    updatedAt: tsToMillis(d.updatedAt),
  };
}

function mapSpend(id: string, d: DocumentData): Spend {
  return {
    id,
    note: typeof d.note === "string" ? d.note : "",
    category: typeof d.category === "string" ? d.category : null,
    amount: typeof d.amount === "number" ? d.amount : 0,
    denoms: fromWire(d.denoms as DenomCountsWire),
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
    total: input.total,
    denoms: toWire(input.denoms),
    verified: false,
    verifiedAt: null,
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

export async function verifyVoucher(uid: string, id: string): Promise<void> {
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

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.update(ref, {
    verified: true,
    verifiedAt: now,
    updatedAt: now,
  });
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "voucher.verify",
      refId: id,
      routeId,
      title: `VCH #${code} verified`,
      amount: total,
      txDate,
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

  const now = serverTimestamp();
  const batch = writeBatch(db);
  batch.delete(ref);

  if (routeId) {
    const routeRef = doc(db, "users", uid, "routes", routeId);
    batch.update(routeRef, {
      voucherCount: increment(-1),
      updatedAt: now,
    });
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
    }),
    createdAt: now,
  });

  await batch.commit();
}

// ── Spends ─────────────────────────────────────────────────────────────

export async function createSpend(
  uid: string,
  input: {
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
      title: `Spend ₹${input.amount} – ${input.note}`,
      amount: input.amount,
      txDate: input.txDate,
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

  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "spend.edit",
      refId: id,
      title: `Spend ₹${after.amount} – ${after.note} edited`,
      amount: after.amount,
      txDate: after.txDate,
      meta: { before, after },
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

  const batch = writeBatch(db);
  batch.delete(ref);
  const activityRef = newRef(activitiesCol(uid));
  batch.set(activityRef, {
    ...buildActivity({
      type: "spend.delete",
      refId: id,
      title: `Spend ₹${amount} – ${note} deleted`,
      amount,
      txDate,
    }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

