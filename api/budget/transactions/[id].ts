import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  updateTransaction,
  deleteTransaction,
} from "../../../lib/budget-storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing transaction id" });
  }

  try {
    if (req.method === "PUT" || req.method === "PATCH") {
      const updated = await updateTransaction(id, req.body);
      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      await deleteTransaction(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error(err);
    return res.status(err.message.includes("not found") ? 404 : 500).json({
      error: err.message,
    });
  }
}
