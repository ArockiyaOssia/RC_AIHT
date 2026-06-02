import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

// POST /api/admin/members — Create a new member (requires admin)
export async function POST(request) {
  try {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: callerProfile } = await supabaseServer.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!callerProfile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const body = await request.json()
    const {
      email, password, firstName, lastName, phone, role,
      memberId, rotaractYear, collegeName, courseName, dateOfBirth,
    } = body

    const supabaseAdmin = createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || "ChangeMe@123",
      email_confirm: true,
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const isAdmin = ["president", "secretary", "treasurer", "faculty_coordinator", "joint_secretary"].includes(role)

    // Create profile
    const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      member_id: memberId,
      first_name: firstName,
      last_name: lastName,
      phone,
      role: role || "member",
      is_admin: isAdmin,
      rotaract_year: rotaractYear || "2025-2026",
      college_name: collegeName,
      course_name: courseName,
      date_of_birth: dateOfBirth,
    }).select().single()

    if (profileError) {
      // Rollback auth user creation
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { ...profile, email } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/members — Delete a member (requires admin)
export async function DELETE(request) {
  try {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: callerProfile } = await supabaseServer.from("profiles").select("is_admin").eq("id", user.id).single()
    if (!callerProfile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: "Member ID required" }, { status: 400 })

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, data: { message: "Member deleted" } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
