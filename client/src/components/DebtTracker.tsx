import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, X, TrendingDown, DollarSign, AlertCircle, CreditCard, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Debt } from "@shared/types";
import { DEBT_TYPES, DEBT_COLORS } from "@shared/types";
import * as api from "../lib/api";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n));
}
function fmtFull(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n));
}

function payoffMonths(balance: number, rate: number, payment: number): number | null {
  if (payment <= 0 || balance <= 0) return null;
  const r = rate / 100 / 12;
  if (r === 0) return Math.ceil(balance / payment);
  if (payment <= balance * r) return null; // payment doesn't cover interest
  return Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r));
}

function payoffLabel(months: number | null): string {
  if (months === null) return "∞";
  if (months <= 1) return "< 1 mo";
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12), m = months % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y} yr${y > 1 ? "s" : ""}`;
}

export default function DebtTracker() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    api.getDebts()
      .then(setDebts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);
  const totalOriginal = useMemo(() => debts.reduce((s, d) => s + d.originalBalance, 0), [debts]);
  const totalPaid = totalOriginal - totalDebt;
  const totalMinPayment = useMemo(() => debts.reduce((s, d) => s + d.minimumPayment, 0), [debts]);
  const overallProgress = totalOriginal > 0 ? Math.min(100, (totalPaid / totalOriginal) * 100) : 0;

  const chartData = useMemo(() =>
    debts.map(d => ({ name: d.name.length > 14 ? d.name.slice(0, 14) + "…" : d.name, balance: d.balance, color: d.color }))
      .sort((a, b) => b.balance - a.balance),
    [debts]
  );

  const deleteDebt = async (id: string) => {
    if (!confirm("Delete this debt?")) return;
    try {
      await api.deleteDebt(id);
      setDebts(prev => prev.filter(d => d.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const makePayment = async (debt: Debt) => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;
    try {
      const newBalance = Math.max(0, debt.balance - amt);
      const updated = await api.updateDebt({ id: debt.id, balance: newBalance });
      setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
      setPayingId(null);
      setPayAmount("");
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", color: "#DC2626", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#DC2626", cursor: "pointer" }}><X size={13} /></button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.4px" }}>Debt Tracker</h1>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          style={{ background: "var(--accent)", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <Plus size={14} /> Add Debt
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <SummaryCard icon={<TrendingDown size={18} />} label="Total Owed" value={fmt(totalDebt)} valueColor="#ef4444" iconBg="#FEF2F2" iconColor="#ef4444" />
        <SummaryCard icon={<DollarSign size={18} />} label="Total Paid Off" value={fmt(totalPaid)} valueColor="var(--accent-green)" iconBg="#F0FDF4" iconColor="var(--accent-green)" />
        <SummaryCard icon={<CreditCard size={18} />} label="Min. Payments/mo" value={fmtFull(totalMinPayment)} valueColor="var(--text-primary)" iconBg="#F3F3F3" iconColor="var(--text-muted)" />
        <SummaryCard icon={<TrendingDown size={18} />} label="Debts" value={String(debts.length)} valueColor="var(--accent)" iconBg="rgba(232,69,0,0.08)" iconColor="var(--accent)" />
      </div>

      {/* Overall progress */}
      {totalOriginal > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Overall Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-green)" }}>{overallProgress.toFixed(1)}% paid off</span>
          </div>
          <div style={{ background: "#EBEBEB", borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${overallProgress}%`, background: "var(--accent-green)", borderRadius: 6, transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
            <span>Paid: {fmt(totalPaid)}</span>
            <span>Remaining: {fmt(totalDebt)}</span>
          </div>
        </div>
      )}

      {/* Chart */}
      {debts.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Balance by Debt</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#999", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #E2E2E2", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                formatter={(v: number) => [fmtFull(v), "Balance"]}
              />
              <Bar dataKey="balance" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Debt list */}
      {debts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text-muted)" }}>
          <TrendingDown size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14, marginBottom: 8 }}>No debts added yet</p>
          <button onClick={() => setShowModal(true)} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Add your first debt
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {debts.map(debt => {
            const pct = debt.originalBalance > 0 ? Math.min(100, ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100) : 0;
            const months = payoffMonths(debt.balance, debt.interestRate, debt.minimumPayment);
            const isPaying = payingId === debt.id;
            return (
              <div key={debt.id} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 4, borderRadius: 2, background: debt.color, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{debt.name}</span>
                        <span style={{ marginLeft: 8, fontSize: 10, background: "#F3F3F3", color: "var(--text-muted)", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>
                          {DEBT_TYPES[debt.type]}
                        </span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{fmtFull(debt.balance)}</span>
                    </div>
                    {/* Details row */}
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", marginBottom: 10, flexWrap: "wrap" }}>
                      {debt.interestRate > 0 && <span>APR: <strong style={{ color: "var(--text-secondary)" }}>{debt.interestRate}%</strong></span>}
                      {debt.minimumPayment > 0 && <span>Min: <strong style={{ color: "var(--text-secondary)" }}>{fmtFull(debt.minimumPayment)}/mo</strong></span>}
                      {months !== null && <span>Payoff: <strong style={{ color: "var(--text-secondary)" }}>{payoffLabel(months)}</strong></span>}
                      {debt.dueDay && <span>Due: <strong style={{ color: "var(--text-secondary)" }}>day {debt.dueDay}</strong></span>}
                    </div>
                    {/* Progress bar */}
                    {debt.originalBalance > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ background: "#EBEBEB", borderRadius: 4, height: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: debt.color, borderRadius: 4, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-muted)" }}>
                          <span>{pct.toFixed(1)}% paid</span>
                          <span>of {fmt(debt.originalBalance)}</span>
                        </div>
                      </div>
                    )}
                    {/* Payment input */}
                    {isPaying ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                        <input
                          type="number" step="0.01" min="0.01"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") makePayment(debt); if (e.key === "Escape") { setPayingId(null); setPayAmount(""); } }}
                          autoFocus
                          placeholder="Amount paid"
                          style={{ background: "#F7F7F7", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 10px", fontSize: 13, width: 130, outline: "none" }}
                        />
                        <button onClick={() => makePayment(debt)} style={{ background: "var(--accent-green)", border: "none", borderRadius: 7, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Apply</button>
                        <button onClick={() => { setPayingId(null); setPayAmount(""); }} style={{ background: "#F3F3F3", border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setPayingId(debt.id); setPayAmount(""); }}
                          style={{ background: "var(--accent)", border: "none", borderRadius: 7, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Minus size={11} /> Make Payment
                        </button>
                        <button onClick={() => { setEditing(debt); setShowModal(true); }} style={{ background: "#F3F3F3", border: "none", borderRadius: 7, padding: "5px 10px", color: "var(--text-muted)", cursor: "pointer" }}><Edit2 size={12} /></button>
                        <button onClick={() => deleteDebt(debt.id)} style={{ background: "#FEF2F2", border: "none", borderRadius: 7, padding: "5px 10px", color: "#ef4444", cursor: "pointer" }}><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <DebtModal
          debt={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={async (data) => {
            try {
              if (editing) {
                const updated = await api.updateDebt({ ...data, id: editing.id } as any);
                setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
              } else {
                const created = await api.createDebt(data as any);
                setDebts(prev => [created, ...prev]);
              }
              setShowModal(false);
              setEditing(null);
            } catch (e: any) { setError(e.message); }
          }}
        />
      )}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, valueColor, iconBg, iconColor }: { icon: React.ReactNode; label: string; value: string; valueColor: string; iconBg: string; iconColor: string }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ background: iconBg, borderRadius: 10, padding: 8, color: iconColor, display: "flex", flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", marginTop: 2, color: valueColor }}>{value}</p>
      </div>
    </div>
  );
}

// ── Debt Modal ────────────────────────────────────────────────────────────────
function DebtModal({ debt, onClose, onSave }: { debt: Debt | null; onClose: () => void; onSave: (data: Partial<Debt>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: debt?.name || "",
    type: debt?.type || "credit_card",
    balance: debt ? String(debt.balance) : "",
    originalBalance: debt ? String(debt.originalBalance) : "",
    interestRate: debt ? String(debt.interestRate) : "",
    minimumPayment: debt ? String(debt.minimumPayment) : "",
    dueDay: debt?.dueDay ? String(debt.dueDay) : "",
    color: debt?.color || DEBT_COLORS[0],
    notes: debt?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const balance = parseFloat(form.balance);
    try {
      await onSave({
        name: form.name,
        type: form.type as Debt["type"],
        balance,
        originalBalance: form.originalBalance ? parseFloat(form.originalBalance) : balance,
        interestRate: form.interestRate ? parseFloat(form.interestRate) : 0,
        minimumPayment: form.minimumPayment ? parseFloat(form.minimumPayment) : 0,
        dueDay: form.dueDay ? parseInt(form.dueDay) : undefined,
        color: form.color,
        notes: form.notes || undefined,
      });
    } finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width: "100%", background: "#F7F7F7", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>{debt ? "Edit Debt" : "Add Debt"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, borderRadius: 6 }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Name *</label><input value={form.name} onChange={e => set("name", e.target.value)} required style={inp} placeholder="e.g. Chase Credit Card, Car Loan" /></div>
          <div>
            <label style={lbl}>Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)} style={inp}>
              {(Object.entries(DEBT_TYPES) as [Debt["type"], string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Current Balance *</label><input type="number" step="0.01" min="0" value={form.balance} onChange={e => set("balance", e.target.value)} required style={inp} placeholder="0.00" /></div>
            <div><label style={lbl}>Original Balance</label><input type="number" step="0.01" min="0" value={form.originalBalance} onChange={e => set("originalBalance", e.target.value)} style={inp} placeholder="Same as balance" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={lbl}>Interest Rate (APR %)</label><input type="number" step="0.01" min="0" value={form.interestRate} onChange={e => set("interestRate", e.target.value)} style={inp} placeholder="e.g. 24.99" /></div>
            <div><label style={lbl}>Min. Payment / mo</label><input type="number" step="0.01" min="0" value={form.minimumPayment} onChange={e => set("minimumPayment", e.target.value)} style={inp} placeholder="0.00" /></div>
          </div>
          <div><label style={lbl}>Due Day (optional)</label><input type="number" min="1" max="31" value={form.dueDay} onChange={e => set("dueDay", e.target.value)} style={inp} placeholder="Day of month" /></div>
          <div>
            <label style={lbl}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DEBT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set("color", c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? "3px solid white" : "2px solid transparent", cursor: "pointer", boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none" }} />
              ))}
            </div>
          </div>
          <div><label style={lbl}>Notes</label><input value={form.notes} onChange={e => set("notes", e.target.value)} style={inp} placeholder="Optional" /></div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: "#F3F3F3", border: "none", borderRadius: 10, padding: 11, color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, background: "var(--accent)", border: "none", borderRadius: 10, padding: 11, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving..." : debt ? "Save Changes" : "Add Debt"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
