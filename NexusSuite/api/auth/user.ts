function getCookie(req: any, name: string): string | null {
  const h = req.headers?.cookie || ""
  const parts = h.split(/;\s*/)
  for (const p of parts) {
    const [k, v] = p.split("=")
    if (k === name) return v || ""
  }
  return null
}

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" })
    return
  }

  const sess = getCookie(req, "session")
  if (!sess) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const tokenStr = Buffer.from(sess, "base64").toString("utf8")
  const email = tokenStr.split(":")[0] || "user@example.com"
  const user = { id: email, email, name: String(email).split("@")[0] }
  res.status(200).json(user)
}