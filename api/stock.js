import { get, put } from "@vercel/blob";
import { verifyTeacher } from "../lib/auth.js";

const STOCK_PATH = "stock/breast-left.json";

function validStructures(value) {
  return Array.isArray(value) && value.length >= 2 && value.every((s) =>
    s && typeof s.key === "string" && typeof s.label === "string" &&
    typeof s.color === "string" && Array.isArray(s.shapes)
  );
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "GET") {
    const result = await get(STOCK_PATH, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) {
      return res.status(404).json({ error: "Stock personalizado no encontrado." });
    }
    const raw = await new Response(result.stream).text();
    try {
      return res.status(200).json(JSON.parse(raw));
    } catch {
      return res.status(500).json({ error: "El stock guardado no es válido." });
    }
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!verifyTeacher(body.username, body.password)) {
      return res.status(401).json({ error: "Credenciales de profesor incorrectas." });
    }
    if (!validStructures(body.structures)) {
      return res.status(400).json({ error: "Contornos inválidos." });
    }

    const payload = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      structures: body.structures
    };

    await put(STOCK_PATH, JSON.stringify(payload), {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json"
    });

    return res.status(200).json({ ok: true, version: payload.version, updatedAt: payload.updatedAt });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Método no permitido." });
}
