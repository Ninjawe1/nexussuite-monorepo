function extractToken(req: any): string | null {
  const h = req.headers?.cookie || ""
  const m = h.match(/(?:better_auth_session|better-auth\.session|authToken)=([^;]+)/)
  return m ? m[1] : null
}

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method Not Allowed" })
    return
  }

  const sess = extractToken(req)
  if (!sess) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const tokenStr = Buffer.from(sess, "base64").toString("utf8")
  const email = tokenStr.split(":")[0] || "user@example.com"
  const user = { id: email, email, name: String(email).split("@")[0] }
  res.status(200).json({ success: true, user })
}
