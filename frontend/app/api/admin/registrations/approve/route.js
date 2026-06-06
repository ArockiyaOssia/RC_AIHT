import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { sendApprovalEmail } from "@/lib/email"

export const runtime = "nodejs"

function genPassword() {
  // Unambiguous chars; guaranteed to contain a digit + symbol.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let p = ""
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p + "@7"
}

// "2025-2026" -> "2526"
function yearCode(year) {
  const parts = (year || "2025-2026").split("-")
  const a = (parts[0] || "2025").slice(-2)
  const b = (parts[1] || "2026").slice(-2)
  return `${a}${b}`
}

// POST /api/admin/registrations/approve  { id }
export async function POST(request) {
  try {
    // Auth: caller must be an admin.
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: caller } = await supabaseServer.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!caller?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: "Request id required" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: reg, error: regErr } = await supabase
      .from("registration_requests")
      .select("*")
      .eq("id", id)
      .single()
    if (regErr || !reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 })
    if (reg.status === "approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 409 })
    }

    const email = reg.email.toLowerCase()

    // Guard against a duplicate auth user.
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (list?.users?.some((u) => u.email?.toLowerCase() === email)) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    // Current rotaract year + member id.
    const { data: settings } = await supabase
      .from("club_settings")
      .select("current_rotaract_year")
      .single()
    const rotaractYear = settings?.current_rotaract_year || "2025-2026"
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
    const seq = String((count || 0) + 1).padStart(3, "0")
    let memberId = `RCAIHT-${yearCode(rotaractYear)}-M-${seq}`

    const password = genPassword()

    // Create auth user.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Create profile (retry once with random suffix on member_id collision).
    let profileError = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await supabase.from("profiles").insert({
        id: authData.user.id,
        member_id: memberId,
        first_name: reg.first_name,
        last_name: reg.last_name || "",
        phone: reg.phone,
        college_name: reg.college_name,
        course_name: reg.course_name,
        date_of_birth: reg.date_of_birth,
        role: "member",
        is_admin: false,
        is_active: true,
        rotaract_year: rotaractYear,
      })
      profileError = error
      if (!error) break
      // Likely a unique-violation on member_id — vary it and retry.
      memberId = `RCAIHT-${yearCode(rotaractYear)}-M-${seq}${Math.floor(Math.random() * 90 + 10)}`
    }
    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Mark request approved.
    await supabase
      .from("registration_requests")
      .update({
        status: "approved",
        member_id: memberId,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)

    // Email credentials (best-effort).
    const name = `${reg.first_name} ${reg.last_name || ""}`.trim()
    const mail = await sendApprovalEmail({
      to: email,
      name,
      loginEmail: email,
      password,
      memberId,
    })

    return NextResponse.json({
      success: true,
      emailSent: mail.sent,
      emailError: mail.error || null,
      // Returned so the admin can relay manually if the email failed to send.
      credentials: mail.sent ? null : { email, password, memberId },
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
