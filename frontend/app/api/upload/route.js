import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { v4 as uuidv4 } from "uuid"

export const runtime = "nodejs"

export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const formData = await request.formData()
    const file = formData.get("photo")
    const bucket = formData.get("bucket") || "photos"
    const folder = formData.get("folder") || "uploads"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name?.split(".").pop() || "jpg"
    const path = `${folder}/${uuidv4()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicUrl, path })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
