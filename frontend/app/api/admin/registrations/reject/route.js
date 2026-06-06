import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import { sendRejectionEmail } from "@/lib/email"

export const runtime = "nodejs"

// POST /api/admin/registrations/reject  { id, reason }
export async function POST(request) {
  try {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: caller } = await supabaseServer.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!caller?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const { id, reason } = await request.json()
    if (!id) return NextResponse.json({ error: "Request id required" }, { status: 400 })

    const supabase = createAdminClient()
    const { data: reg } = await supabase
      .from("registration_requests")
      .select("*")
      .eq("id", id)
      .single()
    if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 })

    await supabase
      .from("registration_requests")
      .update({
        status: "rejected",
        rejection_reason: reason || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)

    const name = `${reg.first_name} ${reg.last_name || ""}`.trim()
    const mail = await sendRejectionEmail({ to: reg.email, name, reason })

    return NextResponse.json({ success: true, emailSent: mail.sent })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
