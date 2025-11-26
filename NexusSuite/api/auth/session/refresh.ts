function extractToken(req: any): string | null {
  const h = req.headers?.cookie || ""
  const m = h.match(/(?:better_auth_session|better-auth\.session|authToken)=([^;]+)/)
  return m ? m[1] : null
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
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
  const maxAge = 7 * 24 * 60 * 60
  const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https")
  const cookieBase = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (isSecure ? "; Secure" : "")
  res.setHeader("Set-Cookie", [
    `better_auth_session=${sess}; ${cookieBase}`,
    `better-auth.session=${sess}; ${cookieBase}`,
    `authToken=${sess}; ${cookieBase}`
  ])
  res.status(200).json({ success: true, user, session: { token: sess, expiresAt: new Date(Date.now() + maxAge * 1000).toISOString() } })
}
