function parseBody(req: any): any {
  try {
    if (typeof req.body === "object" && req.body) return req.body
    const raw = (req as any).rawBody || ""
    return raw ? JSON.parse(raw.toString()) : {}
  } catch {
    return {}
  }
}

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" })
    return
  }

  const { email, password } = parseBody(req)
  if (!email || !password) {
    res.status(400).json({ message: "Missing email or password" })
    return
  }

  const user = { id: email, email, name: String(email).split("@")[0] }
  const token = Buffer.from(`${email}:${Date.now()}:${Math.random()}`).toString("base64")
  const maxAge = 7 * 24 * 60 * 60
  const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https")
  const cookieBase = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (isSecure ? "; Secure" : "")
  res.setHeader("Set-Cookie", [
    `better_auth_session=${token}; ${cookieBase}`,
    `better-auth.session=${token}; ${cookieBase}`,
    `authToken=${token}; ${cookieBase}`
  ])
  res.status(200).json({ success: true, user, session: { token, expiresAt: new Date(Date.now() + maxAge * 1000).toISOString() } })
}
