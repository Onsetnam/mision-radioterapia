import { get, put } from "@vercel/blob";
import { verifyTeacher } from "../lib/auth.js";

const cleanCode = (value) => String(value || "")
  .toUpperCase()
  .replace(/[^A-Z0-9_-]/g, "")
  .slice(0, 16);
const pathFor = (code) => `sessions/${code}.json`;

function validStructures(value) {
  return Array.isArray(value) && value.length >= 2 && value.every((s) =>
    s && typeof s.key === "string" && typeof s.label === "string" &&
    typeof s.color === "string" && Array.isArray(s.shapes) && s.shapes.length > 0
  );
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "GET") {
    const code = cleanCode(req.query?.code);
    if (!code) return res.status(400).json({ error: "Falta código de sesión." });
    const result = await get(pathFor(code), { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return res.status(404).json({ error: "Sesión no encontrada." });
    const raw = await new Response(result.stream).text();
    try {
      return res.status(200).json(JSON.parse(raw));
    } catch {
      return res.status(500).json({ error: "La sesión guardada no es válida." });
    }
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const code = cleanCode(body.code);
    if (!code) return res.status(400).json({ error: "Código de sesión inválido." });
    if (!verifyTeacher(body.username, body.password)) return res.status(401).json({ error: "Credenciales de profesor incorrectas." });
    if (!validStructures(body.structures)) return res.status(400).json({ error: "Contornos inválidos." });

    const payload = {
      code,
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      structures: body.structures
    };
    await put(pathFor(code), JSON.stringify(payload), {
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
