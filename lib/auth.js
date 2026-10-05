import crypto from "node:crypto";

export function verifyTeacher(username, password) {
  const expected = process.env.TEACHER_AUTH_HASH || "";
  if (!expected || typeof username !== "string" || typeof password !== "string") return false;
  const actual = crypto.createHash("sha256").update(`${username}:${password}`, "utf8").digest("hex");
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
