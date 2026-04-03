import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getInventory,
  addInventoryLot,
  updateInventoryLot,
  deleteInventoryLot,
} from "../../lib/budget-storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const lots = await getInventory();
      return res.json({ lots });
    }

    if (req.method === "POST") {
      const { name, category, totalUnits, unitCost, salePrice, sku, receivedAt, color, notes, status } = req.body;
      if (!name || !category || totalUnits == null || unitCost == null || salePrice == null) {
        return res.status(400).json({ error: "name, category, totalUnits, unitCost, salePrice are required" });
      }
      const lot = await addInventoryLot({
        name,
        category,
        totalUnits: Number(totalUnits),
        unitCost: Number(unitCost),
        salePrice: Number(salePrice),
        unitsSold: 0,
        sku: sku || undefined,
        receivedAt: receivedAt || new Date().toISOString(),
        color: color || "#E84500",
        notes: notes || undefined,
        status: status || "active",
      });
      return res.status(201).json({ lot });
    }

    if (req.method === "PUT") {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: "id is required" });
      const lot = await updateInventoryLot(id, updates);
      return res.json({ lot });
    }

    if (req.method === "DELETE") {
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "id is required" });
      await deleteInventoryLot(id);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("[inventory]", e);
    return res.status(500).json({ error: e.message });
  }
}
