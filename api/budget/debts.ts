import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDebts, addDebt, updateDebt, deleteDebt } from "../../lib/budget-storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      return res.status(200).json(await getDebts());
    }

    if (req.method === "POST") {
      const { name, type, balance, originalBalance, interestRate, minimumPayment, dueDay, color, notes } = req.body;
      if (!name || balance === undefined || !type) return res.status(400).json({ error: "Missing required fields" });
      const debt = await addDebt({
        name, type, color: color || "#ef4444",
        balance: Number(balance),
        originalBalance: Number(originalBalance ?? balance),
        interestRate: Number(interestRate ?? 0),
        minimumPayment: Number(minimumPayment ?? 0),
        dueDay: dueDay ? Number(dueDay) : undefined,
        notes,
      });
      return res.status(201).json(debt);
    }

    if (req.method === "PUT") {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: "Missing id" });
      const debt = await updateDebt(id, updates);
      return res.status(200).json(debt);
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await deleteDebt(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
