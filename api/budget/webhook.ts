/**
 * n8n → Budget Dashboard webhook
 *
 * Receives parsed Cash App email data from n8n and creates a transaction.
 *
 * Expected payload from n8n:
 * {
 *   amount: number,           // positive for received, negative for sent
 *   description: string,      // e.g. "Payment from John", "Paid at Starbucks"
 *   merchant: string,         // extracted merchant name (optional)
 *   date: string,             // ISO date string
 *   type: "income"|"expense", // direction
 *   category: string,         // auto-detected or "Cash App"
 *   secret: string            // webhook secret for auth
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { addTransaction } from "../../lib/budget-storage";
import { CATEGORIES } from "../../shared/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Accept secret in body OR as X-Webhook-Secret header (n8n sends as header)
  const secret = process.env.WEBHOOK_SECRET;
  const provided = req.body.secret || req.headers["x-webhook-secret"];
  if (secret && provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { amount, description, merchant, date, type, category, skipBalanceUpdate } = req.body;

    if (!amount || !description || !date || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resolvedCategory =
      category && CATEGORIES.includes(category) ? category : "Cash App";

    // Enforce correct sign: expenses must be negative, income must be positive
    const rawAmount = Math.abs(Number(amount));
    const signedAmount = type === "expense" ? -rawAmount : rawAmount;

    const tx = await addTransaction({
      date: date || new Date().toISOString(),
      description,
      amount: signedAmount,
      category: resolvedCategory,
      type,
      source: "n8n",
      merchant,
    }, skipBalanceUpdate === true);

    return res.status(201).json({ success: true, transaction: tx });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
