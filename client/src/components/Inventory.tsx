import { useState, useEffect, useMemo } from "react";
import { Plus, Package, TrendingUp, DollarSign, Archive, Edit2, Trash2, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { getInventory, createLot, updateLot, deleteLot } from "../lib/api";
import type { InventoryLot } from "@shared/types";
import { INVENTORY_CATEGORIES, INVENTORY_COLORS } from "@shared/types";
import styles from "./Inventory.module.css";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

// ── Lot Modal ─────────────────────────────────────────────────────────────────
interface LotModalProps {
  lot: InventoryLot | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function LotModal({ lot, onClose, onSave }: LotModalProps) {
  const [form, setForm] = useState({
    name: lot?.name ?? "",
    sku: lot?.sku ?? "",
    category: lot?.category ?? INVENTORY_CATEGORIES[0],
    totalUnits: lot?.totalUnits ?? 1,
    unitCost: lot?.unitCost ?? 0,
    salePrice: lot?.salePrice ?? 0,
    receivedAt: lot?.receivedAt ? lot.receivedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    color: lot?.color ?? INVENTORY_COLORS[0],
    notes: lot?.notes ?? "",
    status: lot?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const margin = form.salePrice > 0
    ? ((form.salePrice - form.unitCost) / form.salePrice) * 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.totalUnits < 1) { setError("Total units must be at least 1"); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        totalUnits: Number(form.totalUnits),
        unitCost: Number(form.unitCost),
        salePrice: Number(form.salePrice),
        sku: form.sku || undefined,
        notes: form.notes || undefined,
        receivedAt: new Date(form.receivedAt).toISOString(),
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{lot ? "Edit Lot" : "Add Inventory Lot"}</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {error && <div className={styles.modalError}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formRow}>
            <label>Lot Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. March Protein Batch" />
          </div>
          <div className={styles.formRow}>
            <label>SKU / Item #</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Optional" />
          </div>
          <div className={styles.formRow2}>
            <div className={styles.formRow}>
              <label>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}>
                {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <label>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="sold_out">Sold Out</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow3}>
            <div className={styles.formRow}>
              <label>Total Units *</label>
              <input type="number" min="1" value={form.totalUnits} onChange={e => set("totalUnits", e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label>Cost / Unit</label>
              <input type="number" min="0" step="0.01" value={form.unitCost} onChange={e => set("unitCost", e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label>Sale Price / Unit</label>
              <input type="number" min="0" step="0.01" value={form.salePrice} onChange={e => set("salePrice", e.target.value)} />
            </div>
          </div>
          {form.salePrice > 0 && (
            <div className={styles.marginPreview}>
              Margin: <strong style={{ color: margin >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{pct(margin)}</strong>
              &nbsp;·&nbsp; Potential revenue: <strong>{fmt(form.totalUnits * form.salePrice)}</strong>
              &nbsp;·&nbsp; Potential profit: <strong>{fmt(form.totalUnits * (form.salePrice - form.unitCost))}</strong>
            </div>
          )}
          <div className={styles.formRow2}>
            <div className={styles.formRow}>
              <label>Date Received</label>
              <input type="date" value={form.receivedAt} onChange={e => set("receivedAt", e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <label>Color</label>
              <div className={styles.colorRow}>
                {INVENTORY_COLORS.map(c => (
                  <button key={c} type="button" className={`${styles.colorSwatch} ${form.color === c ? styles.colorSwatchActive : ""}`}
                    style={{ background: c }} onClick={() => set("color", c)} />
                ))}
              </div>
            </div>
          </div>
          <div className={styles.formRow}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Supplier, batch #, etc." />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? "Saving…" : lot ? "Save Changes" : "Add Lot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sell Modal ────────────────────────────────────────────────────────────────
function SellModal({ lot, onClose, onSell }: { lot: InventoryLot; onClose: () => void; onSell: (qty: number) => Promise<void> }) {
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const remaining = lot.totalUnits - lot.unitsSold;

  const handleSell = async () => {
    if (qty < 1 || qty > remaining) return;
    setSaving(true);
    try { await onSell(qty); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.sellModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Record Sale — {lot.name}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.sellBody}>
          <p className={styles.sellAvail}>{remaining} units remaining</p>
          <div className={styles.sellRow}>
            <label>Units Sold</label>
            <input type="number" min={1} max={remaining} value={qty}
              onChange={e => setQty(Math.min(remaining, Math.max(1, Number(e.target.value))))} />
          </div>
          <div className={styles.sellCalc}>
            <span>Revenue: <strong>{fmt(qty * lot.salePrice)}</strong></span>
            <span>Profit: <strong style={{ color: "var(--accent-green)" }}>{fmt(qty * (lot.salePrice - lot.unitCost))}</strong></span>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSell} disabled={saving || qty < 1 || qty > remaining}>
              {saving ? "Saving…" : "Record Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lot Card ──────────────────────────────────────────────────────────────────
function LotCard({ lot, onEdit, onDelete, onSell }: {
  lot: InventoryLot;
  onEdit: () => void;
  onDelete: () => void;
  onSell: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const remaining = lot.totalUnits - lot.unitsSold;
  const soldPct = lot.totalUnits > 0 ? (lot.unitsSold / lot.totalUnits) * 100 : 0;
  const revenue = lot.unitsSold * lot.salePrice;
  const profit = lot.unitsSold * (lot.salePrice - lot.unitCost);
  const margin = lot.salePrice > 0 ? ((lot.salePrice - lot.unitCost) / lot.salePrice) * 100 : 0;

  const statusLabel = { active: "Active", sold_out: "Sold Out", archived: "Archived" }[lot.status];
  const statusColor = { active: "var(--accent-green)", sold_out: "var(--accent-red)", archived: "var(--text-muted)" }[lot.status];

  return (
    <div className={styles.lotCard}>
      <div className={styles.lotCardHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.lotLeft}>
          <div className={styles.lotDot} style={{ background: lot.color }} />
          <div>
            <div className={styles.lotName}>{lot.name}</div>
            <div className={styles.lotMeta}>
              {lot.category}{lot.sku ? ` · ${lot.sku}` : ""}
              <span style={{ color: statusColor, marginLeft: 8 }}>{statusLabel}</span>
            </div>
          </div>
        </div>
        <div className={styles.lotRight}>
          <div className={styles.lotUnits}>
            <span className={styles.lotUnitsRemain}>{remaining}</span>
            <span className={styles.lotUnitsTotal}>/{lot.totalUnits} left</span>
          </div>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <div className={styles.lotProgress}>
        <div className={styles.lotProgressBar} style={{ width: `${soldPct}%`, background: lot.color }} />
      </div>

      {expanded && (
        <div className={styles.lotDetail}>
          <div className={styles.lotStats}>
            <div className={styles.lotStat}>
              <span className={styles.lotStatLabel}>Cost/unit</span>
              <span className={styles.lotStatVal}>{fmt(lot.unitCost)}</span>
            </div>
            <div className={styles.lotStat}>
              <span className={styles.lotStatLabel}>Sale/unit</span>
              <span className={styles.lotStatVal}>{fmt(lot.salePrice)}</span>
            </div>
            <div className={styles.lotStat}>
              <span className={styles.lotStatLabel}>Margin</span>
              <span className={styles.lotStatVal} style={{ color: margin >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{pct(margin)}</span>
            </div>
            <div className={styles.lotStat}>
              <span className={styles.lotStatLabel}>Revenue</span>
              <span className={styles.lotStatVal}>{fmt(revenue)}</span>
            </div>
            <div className={styles.lotStat}>
              <span className={styles.lotStatLabel}>Profit</span>
              <span className={styles.lotStatVal} style={{ color: profit >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{fmt(profit)}</span>
            </div>
            <div className={styles.lotStat}>
              <span className={styles.lotStatLabel}>Sold</span>
              <span className={styles.lotStatVal}>{lot.unitsSold} units</span>
            </div>
          </div>
          {lot.notes && <p className={styles.lotNotes}>{lot.notes}</p>}
          <div className={styles.lotActions}>
            {remaining > 0 && lot.status !== "archived" && (
              <button className={styles.sellBtn} onClick={onSell}>
                <ShoppingCart size={13} /> Record Sale
              </button>
            )}
            <button className={styles.editBtn} onClick={onEdit}><Edit2 size={13} /> Edit</button>
            <button className={styles.deleteBtn} onClick={onDelete}><Trash2 size={13} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Inventory() {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [sellTarget, setSellTarget] = useState<InventoryLot | null>(null);
  const [editTarget, setEditTarget] = useState<InventoryLot | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "sold_out" | "archived">("all");

  const load = async () => {
    try {
      const data = await getInventory();
      setLots(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const active = lots.filter(l => l.status !== "archived");
    const totalInventoryValue = active.reduce((s, l) => s + (l.totalUnits - l.unitsSold) * l.unitCost, 0);
    const totalRevenue = lots.reduce((s, l) => s + l.unitsSold * l.salePrice, 0);
    const totalProfit = lots.reduce((s, l) => s + l.unitsSold * (l.salePrice - l.unitCost), 0);
    const totalUnitsSold = lots.reduce((s, l) => s + l.unitsSold, 0);
    return { totalInventoryValue, totalRevenue, totalProfit, totalUnitsSold, activeLots: active.length };
  }, [lots]);

  const filtered = useMemo(() =>
    filter === "all" ? lots : lots.filter(l => l.status === filter),
    [lots, filter]
  );

  const handleAdd = async (data: any) => {
    const lot = await createLot(data);
    setLots(prev => [lot, ...prev]);
  };

  const handleEdit = async (data: any) => {
    if (!editTarget) return;
    const updated = await updateLot({ id: editTarget.id, ...data });
    setLots(prev => prev.map(l => l.id === updated.id ? updated : l));
  };

  const handleSell = async (qty: number) => {
    if (!sellTarget) return;
    const newSold = sellTarget.unitsSold + qty;
    const newStatus = newSold >= sellTarget.totalUnits ? "sold_out" : sellTarget.status;
    const updated = await updateLot({ id: sellTarget.id, unitsSold: newSold, status: newStatus });
    setLots(prev => prev.map(l => l.id === updated.id ? updated : l));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lot? This cannot be undone.")) return;
    await deleteLot(id);
    setLots(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className={styles.root}>
      {/* Summary */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <Package size={18} className={styles.summaryIcon} />
          <div className={styles.summaryLabel}>Inventory Value</div>
          <div className={styles.summaryVal}>{fmt(summary.totalInventoryValue)}</div>
          <div className={styles.summarySub}>{summary.activeLots} active lots</div>
        </div>
        <div className={styles.summaryCard}>
          <ShoppingCart size={18} className={styles.summaryIcon} />
          <div className={styles.summaryLabel}>Units Sold</div>
          <div className={styles.summaryVal}>{summary.totalUnitsSold}</div>
          <div className={styles.summarySub}>across all lots</div>
        </div>
        <div className={styles.summaryCard}>
          <DollarSign size={18} className={styles.summaryIcon} />
          <div className={styles.summaryLabel}>Revenue</div>
          <div className={styles.summaryVal}>{fmt(summary.totalRevenue)}</div>
          <div className={styles.summarySub}>total earned</div>
        </div>
        <div className={styles.summaryCard}>
          <TrendingUp size={18} className={styles.summaryIcon} />
          <div className={styles.summaryLabel}>Profit</div>
          <div className={styles.summaryVal} style={{ color: summary.totalProfit >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
            {fmt(summary.totalProfit)}
          </div>
          <div className={styles.summarySub}>after cost of goods</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {(["all", "active", "sold_out", "archived"] as const).map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
              onClick={() => setFilter(f)}>
              {f === "sold_out" ? "Sold Out" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className={styles.addLotBtn} onClick={() => { setEditTarget(null); setModal("add"); }}>
          <Plus size={14} /> Add Lot
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Lot list */}
      {loading ? (
        <div className={styles.empty}><div className={styles.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Archive size={32} style={{ opacity: 0.25 }} />
          <p>{filter === "all" ? "No inventory lots yet" : `No ${filter} lots`}</p>
          {filter === "all" && (
            <button className={styles.addLotBtn} onClick={() => { setEditTarget(null); setModal("add"); }}>
              <Plus size={14} /> Add your first lot
            </button>
          )}
        </div>
      ) : (
        <div className={styles.lotList}>
          {filtered.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              onEdit={() => { setEditTarget(lot); setModal("edit"); }}
              onDelete={() => handleDelete(lot.id)}
              onSell={() => setSellTarget(lot)}
            />
          ))}
        </div>
      )}

      {(modal === "add" || modal === "edit") && (
        <LotModal
          lot={modal === "edit" ? editTarget : null}
          onClose={() => setModal(null)}
          onSave={modal === "edit" ? handleEdit : handleAdd}
        />
      )}

      {sellTarget && (
        <SellModal
          lot={sellTarget}
          onClose={() => setSellTarget(null)}
          onSell={handleSell}
        />
      )}
    </div>
  );
}
