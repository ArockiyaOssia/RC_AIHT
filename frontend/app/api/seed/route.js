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
      email: process.env.ADMIN_PRESIDENT_EMAIL,
      password: process.env.ADMIN_PRESIDENT_PASSWORD,
      firstName: "Rtr. Dhivyadarani",
      lastName: "",
      phone: "7305625161",
      role: "president",
      memberId: "RCAIHT-2526-P-001",
    },
    {
      email: process.env.ADMIN_SECRETARY_EMAIL,
      password: process.env.ADMIN_SECRETARY_PASSWORD,
      firstName: "Rtr. Gomathy",
      lastName: "",
      phone: "9944533397",
      role: "secretary",
      memberId: "RCAIHT-2526-S-001",
    },
    {
      email: process.env.ADMIN_TREASURER_EMAIL,
      password: process.env.ADMIN_TREASURER_PASSWORD,
      firstName: "Rtr. Arockiya",
      lastName: "Ossia",
      phone: "8838130136",
      role: "treasurer",
      memberId: "RCAIHT-2526-TR-001",
    },
    {
      email: process.env.ADMIN_FACULTY_EMAIL,
      password: process.env.ADMIN_FACULTY_PASSWORD,
      firstName: "Dr. Anitha M",
      lastName: "",
      phone: "9840497532",
      role: "faculty_coordinator",
      memberId: "RCAIHT-2526-FC-001",
    },
  ]

  const results = []

  for (const admin of adminUsers) {
    try {
      let userId = null

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
      })

      if (authError) {
        // User already exists (from an earlier partial run) — look it up and reset password.
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existingUser = list?.users?.find(
          (u) => u.email?.toLowerCase() === admin.email.toLowerCase()
        )
        if (!existingUser) {
          results.push({ email: admin.email, status: "error", message: authError.message })
          continue
        }
        userId = existingUser.id
        // Ensure password matches the configured one
        await supabase.auth.admin.updateUserById(userId, {
          password: admin.password,
          email_confirm: true,
        })
      } else {
        userId = authData.user.id
      }

      // Upsert profile so re-runs are safe
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          member_id: admin.memberId,
          first_name: admin.firstName,
          last_name: admin.lastName,
          phone: admin.phone,
          role: admin.role,
          is_admin: true,
          rotaract_year: "2025-2026",
        },
        { onConflict: "id" }
      )

      if (profileError) {
        results.push({ email: admin.email, status: "error", message: profileError.message })
      } else {
        results.push({ email: admin.email, status: "ok" })
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
