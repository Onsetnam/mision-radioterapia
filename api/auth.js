import { verifyTeacher } from "../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!verifyTeacher(body.username, body.password)) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }
  return res.status(200).json({ ok: true });
}
