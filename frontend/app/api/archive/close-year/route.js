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
    const supabase = createAdminClient()

    const { data: settings } = await supabase.from("club_settings").select("current_rotaract_year").single()
    const year = body.rotaractYear || settings?.current_rotaract_year

    // Gather summary stats
    const [eventsRes, expensesRes, membersRes] = await Promise.all([
      supabase.from("events").select("id,name,status,attendees,actual_spending").eq("rotaract_year", year),
      supabase.from("expenses").select("amount,status").eq("rotaract_year", year),
      supabase.from("profiles").select("id,role").eq("rotaract_year", year),
    ])

    const summary = {
      year,
      totalEvents: eventsRes.data?.length || 0,
      totalMembers: membersRes.data?.length || 0,
      totalExpenses: expensesRes.data?.reduce((s, e) => s + Number(e.amount), 0) || 0,
      closedAt: new Date().toISOString(),
    }

    // Archive or upsert
    const { error } = await supabase.from("archives").upsert({
      rotaract_year: year,
      summary,
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    }, { onConflict: "rotaract_year" })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Mark events as archived
    await supabase.from("events").update({ is_archived: true }).eq("rotaract_year", year)
    await supabase.from("expenses").update({ is_archived: true }).eq("rotaract_year", year)

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
