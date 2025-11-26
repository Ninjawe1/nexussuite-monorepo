export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" })
    return
  }

  const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https")
  const cookieBase = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0` + (isSecure ? "; Secure" : "")

  res.setHeader("Set-Cookie", [
    `better_auth_session=; ${cookieBase}`,
    `better-auth.session=; ${cookieBase}`,
    `authToken=; ${cookieBase}`
  ])

  res.status(200).json({ success: true, message: "Logged out successfully" })
}
