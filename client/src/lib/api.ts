import type { Transaction, BudgetSettings, Bill, Debt, InventoryLot } from "@shared/types";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// Transactions
export const getTransactions = () =>
  req<Transaction[]>("/budget/transactions");

export const createTransaction = (data: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { skipBalanceUpdate?: boolean }) =>
  req<Transaction>("/budget/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateTransaction = (id: string, data: Partial<Transaction>) =>
  req<Transaction>(`/budget/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteTransaction = (id: string) =>
  req<{ success: boolean }>(`/budget/transactions/${id}`, {
    method: "DELETE",
  });

// Bills
export const getBills = () => req<Bill[]>("/budget/bills");
export const createBill = (data: Omit<Bill, "id" | "createdAt" | "updatedAt">) =>
  req<Bill>("/budget/bills", { method: "POST", body: JSON.stringify(data) });
export const updateBill = (data: Partial<Bill> & { id: string }) =>
  req<Bill>("/budget/bills", { method: "PUT", body: JSON.stringify(data) });
export const deleteBill = (id: string) =>
  req<{ success: boolean }>(`/budget/bills?id=${id}`, { method: "DELETE" });

// Debts
export const getDebts = () => req<Debt[]>("/budget/debts");
export const createDebt = (data: Omit<Debt, "id" | "createdAt" | "updatedAt">) =>
  req<Debt>("/budget/debts", { method: "POST", body: JSON.stringify(data) });
export const updateDebt = (data: Partial<Debt> & { id: string }) =>
  req<Debt>("/budget/debts", { method: "PUT", body: JSON.stringify(data) });
export const deleteDebt = (id: string) =>
  req<{ success: boolean }>(`/budget/debts?id=${id}`, { method: "DELETE" });

// Inventory
export const getInventory = () =>
  req<{ lots: InventoryLot[] }>("/budget/inventory").then(r => r.lots);
export const createLot = (data: Omit<InventoryLot, "id" | "createdAt" | "updatedAt">) =>
  req<{ lot: InventoryLot }>("/budget/inventory", { method: "POST", body: JSON.stringify(data) }).then(r => r.lot);
export const updateLot = (data: Partial<InventoryLot> & { id: string }) =>
  req<{ lot: InventoryLot }>("/budget/inventory", { method: "PUT", body: JSON.stringify(data) }).then(r => r.lot);
export const deleteLot = (id: string) =>
  req<{ ok: boolean }>(`/budget/inventory?id=${id}`, { method: "DELETE" });

// Settings
export const getSettings = () => req<BudgetSettings>("/budget/settings");

export const updateSettings = (data: Partial<BudgetSettings> & { manualOverride?: boolean }) =>
  req<BudgetSettings>("/budget/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
