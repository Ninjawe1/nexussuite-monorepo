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
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64")
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const cookie = [
    `session=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expires.toUTCString()}`
  ].join("; ")

  res.setHeader("Set-Cookie", cookie)
  res.status(200).json({ success: true, user, session: { token, expiresAt: expires.toISOString() } })
}