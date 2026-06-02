import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

// POST /api/seed — Seeds initial admin users. Run ONCE after deployment.
// Protected by SEED_SECRET env var.
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const secret = body.secret || request.headers.get("x-seed-secret")

  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createAdminClient()

  const adminUsers = [
    {
      email: process.env.ADMIN_PRESIDENT_EMAIL || "president@rcaiht.com",
      password: process.env.ADMIN_PRESIDENT_PASSWORD || "ChangeMe@123",
      firstName: "President",
      lastName: "AIHT",
      phone: "9999999999",
      role: "president",
      memberId: "RCAIHT-P-001",
    },
    {
      email: process.env.ADMIN_SECRETARY_EMAIL || "secretary@rcaiht.com",
      password: process.env.ADMIN_SECRETARY_PASSWORD || "ChangeMe@123",
      firstName: "Secretary",
      lastName: "AIHT",
      phone: "9999999998",
      role: "secretary",
      memberId: "RCAIHT-S-001",
    },
    {
      email: process.env.ADMIN_TREASURER_EMAIL || "treasurer@rcaiht.com",
      password: process.env.ADMIN_TREASURER_PASSWORD || "ChangeMe@123",
      firstName: "Treasurer",
      lastName: "AIHT",
      phone: "9999999997",
      role: "treasurer",
      memberId: "RCAIHT-T-001",
    },
  ]

  const results = []

  for (const admin of adminUsers) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
      })

      if (authError) {
        results.push({ email: admin.email, status: "error", message: authError.message })
        continue
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        member_id: admin.memberId,
        first_name: admin.firstName,
        last_name: admin.lastName,
        phone: admin.phone,
        role: admin.role,
        is_admin: true,
        rotaract_year: "2025-2026",
      })

      if (profileError) {
        results.push({ email: admin.email, status: "error", message: profileError.message })
      } else {
        results.push({ email: admin.email, status: "created" })
      }
    } catch (e) {
      results.push({ email: admin.email, status: "error", message: e.message })
    }
  }

  // Ensure club_settings row exists
  const { data: existing } = await supabase.from("club_settings").select("id").single()
  if (!existing) {
    await supabase.from("club_settings").insert({ current_rotaract_year: "2025-2026" })
  }

  return NextResponse.json({ success: true, results })
}
