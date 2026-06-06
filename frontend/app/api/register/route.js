import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

// POST /api/register — Public self-registration. Creates a PENDING request.
// No account is created until an admin approves.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = (body.email || "").trim().toLowerCase()
    const firstName = (body.firstName || "").trim()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }
    if (!firstName) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Reject if an account already exists for this email.
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const exists = list?.users?.some((u) => u.email?.toLowerCase() === email)
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      )
    }

    // Reject if there is already a pending request for this email.
    const { data: pending } = await supabase
      .from("registration_requests")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle()
    if (pending) {
      return NextResponse.json(
        { error: "You already have a registration awaiting approval." },
        { status: 409 }
      )
    }

    const { error } = await supabase.from("registration_requests").insert({
      email,
      first_name: firstName,
      last_name: (body.lastName || "").trim(),
      phone: body.phone || null,
      college_name: body.collegeName || null,
      course_name: body.courseName || null,
      date_of_birth: body.dateOfBirth || null,
      message: body.message || null,
      status: "pending",
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      success: true,
      message: "Registration submitted. You'll receive an email once an admin approves it.",
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
