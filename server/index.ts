import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

// Route handlers (reuse the same logic as Vercel API routes)
import {
  getSettings,
  updateSettings,
  setManualBalance,
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "../lib/budget-storage.js";
import { CATEGORIES } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── Settings ──────────────────────────────────────────────────────────────────

app.get("/api/budget/settings", async (_req, res) => {
  try {
    res.json(await getSettings());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/budget/settings", async (req, res) => {
  try {
    const { startingBalance, currentBalance, manualOverride } = req.body;
    if (manualOverride && currentBalance !== undefined) {
      return res.json(await setManualBalance(Number(currentBalance)));
    }
    const updates: any = {};
    if (startingBalance !== undefined) updates.startingBalance = Number(startingBalance);
    if (currentBalance !== undefined) updates.currentBalance = Number(currentBalance);
    res.json(await updateSettings(updates));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Transactions ───────────────────────────────────────────────────────────────

app.get("/api/budget/transactions", async (_req, res) => {
  try {
    res.json(await getTransactions());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/budget/transactions", async (req, res) => {
  try {
    const { date, description, amount, category, type, source, merchant, notes } = req.body;
    if (!date || !description || amount === undefined || !category || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const tx = await addTransaction({
      date, description, amount: Number(amount), category, type,
      source: source || "manual", merchant, notes,
    });
    res.status(201).json(tx);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/budget/transactions/:id", async (req, res) => {
  try {
    res.json(await updateTransaction(req.params.id, req.body));
  } catch (e: any) {
    res.status(e.message.includes("not found") ? 404 : 500).json({ error: e.message });
  }
});

app.delete("/api/budget/transactions/:id", async (req, res) => {
  try {
    await deleteTransaction(req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Webhook ───────────────────────────────────────────────────────────────────

app.post("/api/budget/webhook", async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.body.secret !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { amount, description, merchant, date, type, category } = req.body;
    if (!amount || !description || !date || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const resolvedCategory =
      category && CATEGORIES.includes(category) ? category : "Cash App";
    const tx = await addTransaction({
      date: date || new Date().toISOString(),
      description, amount: Number(amount), category: resolvedCategory,
      type, source: "n8n", merchant,
    });
    res.status(201).json({ success: true, transaction: tx });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Serve frontend ─────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
