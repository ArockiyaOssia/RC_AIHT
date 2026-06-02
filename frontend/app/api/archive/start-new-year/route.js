import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

export async function POST(request) {
  try {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: callerProfile } = await supabaseServer.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!callerProfile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const body = await request.json()
    const { newYear } = body
    if (!newYear) return NextResponse.json({ error: "newYear is required" }, { status: 400 })

    const supabase = createAdminClient()

    // Update club settings to new year
    const { error } = await supabase.from("club_settings")
      .update({ current_rotaract_year: newYear, updated_at: new Date().toISOString() })
      .neq("id", "00000000-0000-0000-0000-000000000000") // update all rows (singleton)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Create archive entry for new year
    await supabase.from("archives").upsert({
      rotaract_year: newYear,
      summary: { year: newYear, startedAt: new Date().toISOString() },
      is_closed: false,
    }, { onConflict: "rotaract_year" })

    return NextResponse.json({ success: true, data: { newYear, message: "New Rotaract year started" } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
