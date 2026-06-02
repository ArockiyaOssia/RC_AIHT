import { getSupabase } from "@/lib/supabase"

// ============================================
// CASE CONVERSION
// MongoDB/old frontend uses camelCase; Supabase uses snake_case.
// Convert on every read (snake->camel) and write (camel->snake) so
// the existing pages keep working without edits.
// ============================================
const toCamelKey = (k) => k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
const toSnakeKey = (k) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())

const WRITE_STRIP_KEYS = new Set(["_id", "id", "createdAt", "updatedAt", "created_at", "updated_at", "__v"])

function toCamel(value) {
  if (Array.isArray(value)) return value.map(toCamel)
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[toCamelKey(k)] = toCamel(v)
    }
    // Provide Mongo-style _id alias since pages reference record._id
    if (out.id !== undefined && out._id === undefined) out._id = out.id
    return out
  }
  return value
}

function toSnake(value, { strip = false } = {}) {
  if (Array.isArray(value)) return value.map((v) => toSnake(v))
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (strip && WRITE_STRIP_KEYS.has(k)) continue
      out[toSnakeKey(k)] = toSnake(v)
    }
    return out
  }
  return value
}

// Consistent response shape matching old Express API. Reads return camelCase.
const ok = (data) => ({ success: true, data: toCamel(data) })
const err = (msg) => { throw new Error(msg) }

class ApiService {
  get sb() {
    return getSupabase()
  }

  // ==========================================
  // LEGACY REST COMPAT
  // A few pages still call api.request("/path", {method}). Route those
  // handful of endpoints to Supabase so they keep working.
  // ==========================================
  async request(endpoint, options = {}) {
    const method = (options.method || "GET").toUpperCase()
    const body = options.body

    // Gallery list
    if (endpoint === "/gallery/public" && method === "GET") {
      return this.getPublicGallery()
    }

    // Gallery upload — FormData { gallery, caption, category }
    if (endpoint === "/gallery/upload" && method === "POST") {
      const { data: { user } } = await this.sb.auth.getUser()
      const file = body.get("gallery")
      const caption = body.get("caption")
      const category = body.get("category") || "General"
      if (!file) err("No image provided")
      const { data: profile } = await this.sb.from("profiles").select("rotaract_year").eq("id", user.id).single()
      const ext = file.name.split(".").pop()
      const path = `gallery/${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await this.sb.storage.from("photos").upload(path, file)
      if (upErr) err(upErr.message)
      const { data: { publicUrl } } = this.sb.storage.from("photos").getPublicUrl(path)
      const { data: img, error } = await this.sb.from("gallery_images").insert({
        url: publicUrl, file_id: path, caption, category,
        uploaded_by: user.id, rotaract_year: profile?.rotaract_year || "2025-2026",
      }).select().single()
      if (error) err(error.message)
      return ok(img)
    }

    // Gallery delete — /gallery/:id
    const galleryDelete = endpoint.match(/^\/gallery\/([^/]+)$/)
    if (galleryDelete && method === "DELETE") {
      return this.deleteGalleryImage(galleryDelete[1])
    }

    // Event gallery upload — /events/:id/gallery  FormData { gallery: files }
    const eventGallery = endpoint.match(/^\/events\/([^/]+)\/gallery$/)
    if (eventGallery && method === "POST") {
      const res = await this.addEventGallery(eventGallery[1], body)
      // page expects response.data to be the gallery array
      return { success: true, data: res.data?.gallery || [] }
    }

    // Member record export — build CSV of the member's expenses
    if (endpoint === "/members/export-record") {
      const { data: { user } } = await this.sb.auth.getUser()
      const { data: rows } = await this.sb
        .from("expenses")
        .select("date, category, amount, status, payment_mode, description, event:events(name)")
        .eq("member", user.id)
        .order("date", { ascending: false })
      const header = "Date,Category,Amount,Status,Payment Mode,Event,Description\n"
      const csv = header + (rows || []).map((r) =>
        [r.date, r.category, r.amount, r.status, r.payment_mode, r.event?.name || "", (r.description || "").replace(/,/g, ";")].join(",")
      ).join("\n")
      return { success: true, data: csv }
    }

    err(`Unsupported legacy endpoint: ${method} ${endpoint}`)
  }

  // ==========================================
  // AUTH
  // ==========================================

  async login({ email, password }) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) err(error.message)
    const { data: profile } = await this.sb.from("profiles").select("*").eq("id", data.user.id).single()
    await this.sb.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", data.user.id)
    return ok({ user: profile, accessToken: data.session.access_token, refreshToken: data.session.refresh_token })
  }

  async adminLogin({ email, password }) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) err(error.message)
    const { data: profile } = await this.sb.from("profiles").select("*").eq("id", data.user.id).single()
    if (!profile?.is_admin) {
      await this.sb.auth.signOut()
      err("Access denied. Admin privileges required.")
    }
    await this.sb.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", data.user.id)
    return ok({ user: profile, accessToken: data.session.access_token, refreshToken: data.session.refresh_token })
  }

  async logout() {
    await this.sb.auth.signOut()
    return ok(null)
  }

  async getMe() {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")
    const { data: profile } = await this.sb.from("profiles").select("*").eq("id", user.id).single()
    return ok({ ...profile, email: user.email })
  }

  async forgotPassword(email) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    if (error) err(error.message)
    return ok({ message: "Password reset email sent" })
  }

  async resetPassword(token, password) {
    const { error } = await this.sb.auth.updateUser({ password })
    if (error) err(error.message)
    return ok({ message: "Password updated successfully" })
  }

  async changePassword({ currentPassword, newPassword }) {
    const { data: { user } } = await this.sb.auth.getUser()
    // Re-authenticate to verify current password
    const { error: signInError } = await this.sb.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) err("Current password is incorrect")
    const { error } = await this.sb.auth.updateUser({ password: newPassword })
    if (error) err(error.message)
    await this.sb.from("profiles").update({ has_changed_password: true }).eq("id", user.id)
    return ok({ message: "Password changed successfully" })
  }

  async requestEmailChange({ newEmail, password }) {
    const { error } = await this.sb.auth.updateUser({ email: newEmail })
    if (error) err(error.message)
    return ok({ message: "Confirmation email sent to new address" })
  }

  async approveEmailChange(token) {
    return ok({ message: "Email change approved" })
  }

  // ==========================================
  // MEMBER
  // ==========================================

  async getMemberDashboard() {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")

    const [profileRes, expensesRes, eventsRes] = await Promise.all([
      this.sb.from("profiles").select("*").eq("id", user.id).single(),
      this.sb.from("expenses").select("*, event:events(id,name,start_date)").eq("member", user.id).order("created_at", { ascending: false }).limit(5),
      this.sb.from("events").select("id,name,start_date,status,category").order("start_date", { ascending: false }).limit(5),
    ])

    const { data: statsData } = await this.sb
      .from("expenses")
      .select("amount, status")
      .eq("member", user.id)

    const stats = statsData || []
    const sumBy = (pred) => stats.filter(pred).reduce((s, e) => s + Number(e.amount), 0)

    return ok({
      user: profileRes.data,
      recentExpenses: expensesRes.data || [],
      recentEvents: eventsRes.data || [],
      summary: {
        totalContribution: sumBy(() => true),
        approvedExpenses: sumBy((e) => e.status === "approved" || e.status === "reimbursed"),
        pendingReimbursements: sumBy((e) => e.status === "pending"),
        rejectedExpenses: stats.filter((e) => e.status === "rejected").length,
      },
    })
  }

  async getMemberProfile() {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")
    const { data, error } = await this.sb.from("profiles").select("*").eq("id", user.id).single()
    if (error) err(error.message)
    return ok({ ...data, email: user.email })
  }

  async updateMemberProfile(data) {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")
    const payload = toSnake(data, { strip: true })
    delete payload.email // email lives in auth.users, not profiles
    const { data: updated, error } = await this.sb.from("profiles").update(payload).eq("id", user.id).select().single()
    if (error) err(error.message)
    return ok(updated)
  }

  async updateProfilePhoto(formData) {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")
    const file = formData.get("photo")
    if (!file) err("No file provided")
    const ext = file.name.split(".").pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await this.sb.storage.from("profiles").upload(path, file, { upsert: true })
    if (uploadError) err(uploadError.message)
    const { data: { publicUrl } } = this.sb.storage.from("profiles").getPublicUrl(path)
    const { data: updated, error } = await this.sb.from("profiles").update({ photo: publicUrl, photo_id: path }).eq("id", user.id).select().single()
    if (error) err(error.message)
    return ok(updated)
  }

  async getMemberExpenses(params = {}) {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")
    let query = this.sb.from("expenses").select("*, event:events(id,name,start_date,category)").eq("member", user.id).order("created_at", { ascending: false })
    if (params.status) query = query.eq("status", params.status)
    const { data, error } = await query
    if (error) err(error.message)
    return ok(data)
  }

  async getMemberExpense(id) {
    const { data, error } = await this.sb.from("expenses").select("*, event:events(id,name,start_date), member:profiles!member(id,first_name,last_name)").eq("id", id).single()
    if (error) err(error.message)
    return ok(data)
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  async submitExpense(formData) {
    const { data: { user } } = await this.sb.auth.getUser()
    if (!user) err("Not authenticated")

    const { data: profile } = await this.sb.from("profiles").select("rotaract_year").eq("id", user.id).single()

    let billUrl = null
    let billFileId = null
    let billOriginalName = null

    const bill = formData.get("bill")
    if (bill && bill.size > 0) {
      const ext = bill.name.split(".").pop()
      const path = `bills/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await this.sb.storage.from("documents").upload(path, bill)
      if (uploadError) err(uploadError.message)
      const { data: { publicUrl } } = this.sb.storage.from("documents").getPublicUrl(path)
      billUrl = publicUrl
      billFileId = path
      billOriginalName = bill.name
    }

    const expenseData = {
      member: user.id,
      event: formData.get("event"),
      category: formData.get("category"),
      amount: Number(formData.get("amount")),
      date: formData.get("date") || new Date().toISOString(),
      payment_mode: formData.get("paymentMode"),
      description: formData.get("description"),
      notes: formData.get("notes"),
      bill_url: billUrl,
      bill_file_id: billFileId,
      bill_original_name: billOriginalName,
      rotaract_year: profile?.rotaract_year || "2025-2026",
    }

    const { data, error } = await this.sb.from("expenses").insert(expenseData).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async getExpense(id) {
    const { data, error } = await this.sb
      .from("expenses")
      .select("*, event:events(id,name,start_date), member:profiles!member(id,first_name,last_name,photo)")
      .eq("id", id)
      .single()
    if (error) err(error.message)
    return ok(data)
  }

  async getAllExpenses(params = {}) {
    let query = this.sb
      .from("expenses")
      .select("*, event:events(id,name,start_date), member:profiles!member(id,first_name,last_name,photo,member_id)")
      .order("created_at", { ascending: false })

    if (params.status) query = query.eq("status", params.status)
    if (params.category) query = query.eq("category", params.category)
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    if (params.eventId) query = query.eq("event", params.eventId)
    if (params.search) query = query.ilike("description", `%${params.search}%`)

    const { data, error } = await query
    if (error) err(error.message)
    return ok(data)
  }

  async updateExpense(id, data) {
    const { data: updated, error } = await this.sb.from("expenses").update(toSnake(data, { strip: true })).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(updated)
  }

  async approveExpense(id) {
    const { data: { user } } = await this.sb.auth.getUser()
    const { data, error } = await this.sb.from("expenses").update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async rejectExpense(id, reason) {
    const { data: { user } } = await this.sb.auth.getUser()
    const { data, error } = await this.sb.from("expenses").update({
      status: "rejected",
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    }).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async reimburseExpense(id) {
    const { data: { user } } = await this.sb.auth.getUser()
    const { data, error } = await this.sb.from("expenses").update({
      status: "reimbursed",
      reimbursed_by: user.id,
      reimbursed_at: new Date().toISOString(),
    }).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async deleteExpense(id) {
    const { error } = await this.sb.from("expenses").delete().eq("id", id)
    if (error) err(error.message)
    return ok({ message: "Expense deleted" })
  }

  async addManualExpense(data) {
    const { data: { user } } = await this.sb.auth.getUser()
    let billUrl = null, billFileId = null, billOriginalName = null

    if (data instanceof FormData) {
      const bill = data.get("bill")
      if (bill && bill.size > 0) {
        const ext = bill.name.split(".").pop()
        const path = `bills/manual/${Date.now()}.${ext}`
        await this.sb.storage.from("documents").upload(path, bill)
        const { data: { publicUrl } } = this.sb.storage.from("documents").getPublicUrl(path)
        billUrl = publicUrl
        billFileId = path
        billOriginalName = bill.name
      }
      const expenseData = {
        member: data.get("member"),
        event: data.get("event"),
        category: data.get("category"),
        amount: Number(data.get("amount")),
        date: data.get("date") || new Date().toISOString(),
        payment_mode: data.get("paymentMode"),
        description: data.get("description"),
        notes: data.get("notes"),
        bill_url: billUrl,
        bill_file_id: billFileId,
        bill_original_name: billOriginalName,
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rotaract_year: data.get("rotaractYear") || "2025-2026",
      }
      const { data: inserted, error } = await this.sb.from("expenses").insert(expenseData).select().single()
      if (error) err(error.message)
      return ok(inserted)
    }

    const { data: inserted, error } = await this.sb.from("expenses").insert({
      ...toSnake(data, { strip: true }),
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).select().single()
    if (error) err(error.message)
    return ok(inserted)
  }

  // ==========================================
  // EVENTS
  // ==========================================

  async getEvents(params = {}) {
    let query = this.sb.from("events").select("*, coordinator:profiles!coordinator(id,first_name,last_name)").order("start_date", { ascending: false })
    if (params.status) query = query.eq("status", params.status)
    if (params.category) query = query.eq("category", params.category)
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    if (params.isArchived !== undefined) query = query.eq("is_archived", params.isArchived === "true")
    const { data, error } = await query
    if (error) err(error.message)
    return ok(data)
  }

  async getEventsDropdown() {
    const { data, error } = await this.sb.from("events").select("id,name,start_date,status").order("start_date", { ascending: false })
    if (error) err(error.message)
    return ok(data)
  }

  async getEvent(id) {
    const { data, error } = await this.sb
      .from("events")
      .select("*, coordinator:profiles!coordinator(id,first_name,last_name)")
      .eq("id", id)
      .single()
    if (error) err(error.message)
    return ok(data)
  }

  async createEvent(eventData) {
    const { data: { user } } = await this.sb.auth.getUser()
    const { data: profile } = await this.sb.from("profiles").select("rotaract_year").eq("id", user.id).single()

    const payload = {
      ...toSnake(eventData, { strip: true }),
      created_by: user.id,
      rotaract_year: eventData.rotaractYear || profile?.rotaract_year || "2025-2026",
    }
    const { data, error } = await this.sb.from("events").insert(payload).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async updateEvent(id, eventData) {
    const { data, error } = await this.sb.from("events").update(toSnake(eventData, { strip: true })).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async deleteEvent(id) {
    const { error } = await this.sb.from("events").delete().eq("id", id)
    if (error) err(error.message)
    return ok({ message: "Event deleted" })
  }

  async addEventGallery(eventId, formData) {
    const files = formData.getAll("gallery")
    const uploaded = []

    for (const file of files) {
      const ext = file.name.split(".").pop()
      const path = `events/${eventId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await this.sb.storage.from("photos").upload(path, file)
      if (uploadError) continue
      const { data: { publicUrl } } = this.sb.storage.from("photos").getPublicUrl(path)
      uploaded.push({ url: publicUrl, fileId: path, uploadedAt: new Date().toISOString() })
    }

    const { data: event } = await this.sb.from("events").select("gallery").eq("id", eventId).single()
    const gallery = [...(event?.gallery || []), ...uploaded]
    const { data, error } = await this.sb.from("events").update({ gallery }).eq("id", eventId).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async addEventGalleryImages(id, images) {
    const formData = new FormData()
    Array.from(images).forEach(img => formData.append("gallery", img))
    return this.addEventGallery(id, formData)
  }

  // ==========================================
  // ADMIN
  // ==========================================

  // Returns the rich { summary, monthlyExpenses, expensesByCategory,
  // topContributors, recentExpenses } shape the admin dashboard renders.
  // Raw (no toCamel) to preserve _id keys the charts read.
  async getAdminDashboard() {
    const year = await this._currentYear()
    const [membersRes, eventsRes, expensesRes, messagesRes, recentRes] = await Promise.all([
      this.sb.from("profiles").select("id, is_active", { count: "exact" }),
      this.sb.from("events").select("id, status", { count: "exact" }).eq("rotaract_year", year),
      this.sb.from("expenses").select("amount, status, category, date, member:profiles!member(first_name,last_name,member_id)").eq("rotaract_year", year),
      this.sb.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
      this.sb.from("expenses").select("id, amount, status, event:events(name), member:profiles!member(first_name,last_name)").eq("rotaract_year", year).order("created_at", { ascending: false }).limit(5),
    ])

    const rows = expensesRes.data || []
    const totalSpending = rows.reduce((s, e) => s + Number(e.amount), 0)
    const totalContributions = rows.filter((e) => e.status === "approved" || e.status === "reimbursed").reduce((s, e) => s + Number(e.amount), 0)
    const pendingReimbursements = rows.filter((e) => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0)
    const pendingCount = rows.filter((e) => e.status === "pending").length

    const monthMap = {}
    const catMap = {}
    const contribMap = {}
    rows.forEach((e) => {
      const m = new Date(e.date).getMonth() + 1
      monthMap[m] = (monthMap[m] || 0) + Number(e.amount)
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount)
      const key = e.member?.member_id || `${e.member?.first_name} ${e.member?.last_name}`
      if (key) {
        if (!contribMap[key]) contribMap[key] = { member: { firstName: e.member?.first_name, lastName: e.member?.last_name, memberId: e.member?.member_id }, totalContribution: 0 }
        contribMap[key].totalContribution += Number(e.amount)
      }
    })

    return {
      success: true,
      data: {
        rotaractYear: year,
        summary: {
          totalSpending,
          totalContributions,
          pendingReimbursements,
          pendingCount,
          totalMembers: membersRes.count || 0,
          totalEvents: eventsRes.count || 0,
        },
        monthlyExpenses: Object.entries(monthMap).map(([m, total]) => ({ _id: Number(m), total })),
        expensesByCategory: Object.entries(catMap).map(([c, total]) => ({ _id: c, total })),
        topContributors: Object.values(contribMap).sort((a, b) => b.totalContribution - a.totalContribution).slice(0, 5),
        recentExpenses: (recentRes.data || []).map((e) => ({
          _id: e.id,
          member: { firstName: e.member?.first_name, lastName: e.member?.last_name },
          event: { name: e.event?.name },
          amount: e.amount,
          status: e.status,
        })),
      },
    }
  }

  async getAdminMessages() {
    const { data, error } = await this.sb.from("contact_messages").select("*").order("created_at", { ascending: false })
    if (error) err(error.message)
    return ok(data)
  }

  async replyToMessage(id, replyMessage) {
    const { data: { user } } = await this.sb.auth.getUser()
    const { data, error } = await this.sb.from("contact_messages").update({
      reply: replyMessage,
      replied_at: new Date().toISOString(),
      replied_by: user.id,
      is_read: true,
    }).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async deleteMessage(id) {
    const { error } = await this.sb.from("contact_messages").delete().eq("id", id)
    if (error) err(error.message)
    return ok({ message: "Message deleted" })
  }

  async getAllMembers(params = {}) {
    let query = this.sb.from("profiles").select("*").order("created_at", { ascending: false })
    if (params.role) query = query.eq("role", params.role)
    if (params.isActive !== undefined) query = query.eq("is_active", params.isActive === "true" || params.isActive === true)
    // Pages pass status: 'active' | 'inactive'
    if (params.status === "active") query = query.eq("is_active", true)
    if (params.status === "inactive") query = query.eq("is_active", false)
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    if (params.search) query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`)
    const { data, error } = await query
    if (error) err(error.message)
    return ok(data)
  }

  async getMembersDropdown() {
    const { data, error } = await this.sb.from("profiles").select("id,first_name,last_name,role,member_id").eq("is_active", true).order("first_name")
    if (error) err(error.message)
    return ok(data)
  }

  async getMember(id) {
    const { data, error } = await this.sb.from("profiles").select("*").eq("id", id).single()
    if (error) err(error.message)
    return ok(data)
  }

  async addMember(data) {
    const response = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    if (!response.ok) err(result.error || "Failed to create member")
    return ok(result.data)
  }

  async updateMember(id, data) {
    const payload = toSnake(data, { strip: true })
    delete payload.email // email lives in auth.users, not profiles
    const { data: updated, error } = await this.sb.from("profiles").update(payload).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(updated)
  }

  async changeMemberRole(id, role) {
    const isAdmin = ["president", "secretary", "treasurer", "faculty_coordinator", "joint_secretary"].includes(role)
    const { data, error } = await this.sb.from("profiles").update({ role, is_admin: isAdmin }).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async markAsAlumni(id) {
    const { data, error } = await this.sb.from("profiles").update({ is_alumni: true, role: "alumni" }).eq("id", id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  async deleteMember(id) {
    const response = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const result = await response.json()
    if (!response.ok) err(result.error || "Failed to delete member")
    return result
  }

  // ==========================================
  // BOARD
  // ==========================================

  // The board admin/public pages expect a single board OBJECT with a
  // members[] array and a `position` field per member. We store flat rows
  // in board_members (one per officer) and bridge the shape here.
  async _currentYear() {
    const { data } = await this.sb.from("club_settings").select("current_rotaract_year").single()
    return data?.current_rotaract_year || "2025-2026"
  }

  _rowToMember(row) {
    return {
      id: row.id,
      _id: row.id,
      position: row.role, // page uses `position`; we store it in `role`
      role: row.role,
      name: row.name,
      photo: row.photo,
      photoId: row.photo_id,
      email: row.email,
      phone: row.phone,
      department: row.department,
      rotaractYear: row.rotaract_year,
      displayOrder: row.display_order,
    }
  }

  async _boardObject(year) {
    const { data, error } = await this.sb
      .from("board_members")
      .select("*")
      .eq("rotaract_year", year)
      .order("display_order")
    if (error) err(error.message)
    return { rotaractYear: year, theme: "", members: (data || []).map((r) => this._rowToMember(r)) }
  }

  async getCurrentBoard() {
    const year = await this._currentYear()
    return { success: true, data: await this._boardObject(year) }
  }

  async getBoardByYear(year) {
    return { success: true, data: await this._boardObject(year) }
  }

  async getBoardHistory() {
    const { data, error } = await this.sb
      .from("board_members")
      .select("rotaract_year")
      .order("rotaract_year", { ascending: false })
    if (error) err(error.message)
    const years = [...new Set(data?.map((b) => b.rotaract_year) || [])]
    return ok(years)
  }

  // Replace the whole board for a year from a board object { members, rotaractYear }
  async createOrUpdateBoard(data) {
    const rotaractYear = data.rotaractYear || (await this._currentYear())
    const members = Array.isArray(data.members) ? data.members : []
    await this.sb.from("board_members").delete().eq("rotaract_year", rotaractYear)
    if (members.length === 0) return ok([])
    const rows = members.map((m, i) => ({
      rotaract_year: rotaractYear,
      role: m.position || m.role,
      name: m.name,
      email: m.email || null,
      phone: m.phone || null,
      photo: m.photo || null,
      department: m.department || null,
      display_order: i,
    }))
    const { data: inserted, error } = await this.sb.from("board_members").insert(rows).select()
    if (error) err(error.message)
    return ok(inserted)
  }

  // Add or update a single officer (matched by year + position/role).
  async updateBoardMember(data) {
    const year = await this._currentYear()
    let fields = {}
    let photoFile = null
    let existingPhoto = null

    if (data instanceof FormData) {
      const raw = Object.fromEntries(data)
      photoFile = data.get("photo") instanceof File ? data.get("photo") : null
      if (typeof raw.photo === "string") existingPhoto = raw.photo
      fields = {
        role: raw.position || raw.role,
        name: raw.name,
        email: raw.email || null,
        phone: raw.phone || null,
        department: raw.department || null,
      }
    } else {
      fields = {
        role: data.position || data.role,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        department: data.department || null,
      }
      existingPhoto = typeof data.photo === "string" ? data.photo : null
    }

    if (!fields.role) err("position is required")

    // Find existing officer for this year + position
    const { data: existingRows } = await this.sb
      .from("board_members")
      .select("id, display_order")
      .eq("rotaract_year", year)
      .eq("role", fields.role)
      .limit(1)
    const existing = existingRows?.[0]

    // Upload new photo if provided
    let photoUrl = existingPhoto
    if (photoFile && photoFile.size > 0) {
      const ext = photoFile.name.split(".").pop()
      const path = `board/${year}/${fields.role}-${Date.now()}.${ext}`
      const { error: upErr } = await this.sb.storage.from("photos").upload(path, photoFile, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = this.sb.storage.from("photos").getPublicUrl(path)
        photoUrl = publicUrl
      }
    }
    if (photoUrl) fields.photo = photoUrl

    if (existing) {
      const { data: updated, error } = await this.sb
        .from("board_members")
        .update(fields)
        .eq("id", existing.id)
        .select()
        .single()
      if (error) err(error.message)
      return ok(updated)
    }

    // Insert new officer at the end
    const { count } = await this.sb
      .from("board_members")
      .select("id", { count: "exact", head: true })
      .eq("rotaract_year", year)
    const { data: inserted, error } = await this.sb
      .from("board_members")
      .insert({ ...fields, rotaract_year: year, display_order: count || 0 })
      .select()
      .single()
    if (error) err(error.message)
    return ok(inserted)
  }

  // ==========================================
  // SETTINGS
  // ==========================================

  async getSettings() {
    const { data, error } = await this.sb.from("club_settings").select("*").single()
    if (error) err(error.message)
    return ok(data)
  }

  async updateSettings(data) {
    const { data: existing } = await this.sb.from("club_settings").select("id").single()
    const { data: updated, error } = await this.sb.from("club_settings").update(toSnake(data, { strip: true })).eq("id", existing.id).select().single()
    if (error) err(error.message)
    return ok(updated)
  }

  async updateLogos(formData) {
    const { data: existing } = await this.sb.from("club_settings").select("id").single()
    const updates = {}
    const logoFields = ["clubLogo", "rotaractLogo", "parentClubLogo", "collegeLogo"]

    for (const field of logoFields) {
      const file = formData.get(field)
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop()
        const path = `${field}.${ext}`
        await this.sb.storage.from("logos").upload(path, file, { upsert: true })
        const { data: { publicUrl } } = this.sb.storage.from("logos").getPublicUrl(path)
        const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase()
        updates[dbField] = publicUrl
      }
    }

    const { data, error } = await this.sb.from("club_settings").update(updates).eq("id", existing.id).select().single()
    if (error) err(error.message)
    return ok(data)
  }

  // ==========================================
  // REPORTS (delegated to Next.js API routes)
  // ==========================================

  // NOTE: report methods return raw {success,data} (no toCamel) because they
  // build hand-shaped objects with _id / month keys the pages read directly.
  async getFinancialSummary(params = {}) {
    let query = this.sb.from("expenses").select("amount, status, category, date, rotaract_year")
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    const { data, error } = await query
    if (error) err(error.message)
    const rows = data || []

    const sum = (pred) => rows.filter(pred).reduce((s, e) => s + Number(e.amount), 0)
    const byMonthMap = {}
    const byCatMap = {}
    rows.forEach((e) => {
      const m = new Date(e.date).getMonth() + 1
      byMonthMap[m] = (byMonthMap[m] || 0) + Number(e.amount)
      byCatMap[e.category] = (byCatMap[e.category] || 0) + Number(e.amount)
    })

    return {
      success: true,
      data: {
        totals: {
          totalExpenses: sum(() => true),
          totalApproved: sum((e) => e.status === "approved"),
          totalPending: sum((e) => e.status === "pending"),
          totalReimbursed: sum((e) => e.status === "reimbursed"),
        },
        expensesByMonth: Object.entries(byMonthMap).map(([month, total]) => ({
          _id: { month: Number(month) },
          total,
        })),
        expensesByCategory: Object.entries(byCatMap).map(([cat, total]) => ({
          _id: cat,
          total,
        })),
      },
    }
  }

  async getMemberWiseReport(params = {}) {
    let query = this.sb
      .from("expenses")
      .select("amount, status, member:profiles!member(id,first_name,last_name,member_id)")
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    const { data, error } = await query
    if (error) err(error.message)

    const memberMap = {}
    ;(data || []).forEach((e) => {
      const id = e.member?.id
      if (!id) return
      if (!memberMap[id]) {
        memberMap[id] = {
          member: {
            firstName: e.member.first_name,
            lastName: e.member.last_name,
            memberId: e.member.member_id,
          },
          totalAmount: 0,
          approvedAmount: 0,
          expenseCount: 0,
        }
      }
      memberMap[id].totalAmount += Number(e.amount)
      memberMap[id].expenseCount++
      if (e.status === "approved") memberMap[id].approvedAmount += Number(e.amount)
    })
    return { success: true, data: { members: Object.values(memberMap) } }
  }

  async getEventWiseReport(params = {}) {
    let query = this.sb
      .from("expenses")
      .select("amount, status, event:events(id,name,category,start_date,estimated_budget,status)")
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    const { data, error } = await query
    if (error) err(error.message)

    const eventMap = {}
    ;(data || []).forEach((e) => {
      const ev = e.event
      if (!ev?.id) return
      if (!eventMap[ev.id]) {
        eventMap[ev.id] = {
          name: ev.name,
          category: ev.category,
          estimatedBudget: Number(ev.estimated_budget) || 0,
          status: ev.status,
          totalExpenses: 0,
          expenseCount: 0,
        }
      }
      eventMap[ev.id].totalExpenses += Number(e.amount)
      eventMap[ev.id].expenseCount++
    })
    return { success: true, data: { events: Object.values(eventMap) } }
  }

  async getLeaderboard() {
    const { data, error } = await this.sb
      .from("expenses")
      .select("amount, member:profiles!member(id,first_name,last_name,photo,member_id)")
      .eq("status", "approved")
    if (error) err(error.message)

    const memberMap = {}
    ;(data || []).forEach((e) => {
      const id = e.member?.id
      if (!id) return
      if (!memberMap[id]) {
        memberMap[id] = {
          member: {
            firstName: e.member.first_name,
            lastName: e.member.last_name,
            memberId: e.member.member_id,
            photo: e.member.photo,
          },
          totalContribution: 0,
          eventsCount: 0,
        }
      }
      memberMap[id].totalContribution += Number(e.amount)
      memberMap[id].eventsCount++
    })
    const leaderboard = Object.values(memberMap)
      .sort((a, b) => b.totalContribution - a.totalContribution)
      .slice(0, 10)
      .map((item, i) => ({ ...item, rank: i + 1 }))
    return { success: true, data: { leaderboard } }
  }

  async exportPDF(params = {}) {
    const query = new URLSearchParams(params).toString()
    const response = await fetch(`/api/reports/pdf${query ? `?${query}` : ""}`)
    if (!response.ok) err("Failed to generate PDF")
    return response
  }

  async exportExcel(params = {}) {
    const query = new URLSearchParams(params).toString()
    const response = await fetch(`/api/reports/excel${query ? `?${query}` : ""}`)
    if (!response.ok) err("Failed to generate Excel")
    return response
  }

  async exportBillsZip(params = {}) {
    const query = new URLSearchParams(params).toString()
    const response = await fetch(`/api/reports/bills${query ? `?${query}` : ""}`)
    if (!response.ok) err("Failed to generate ZIP")
    return response
  }

  // ==========================================
  // GALLERY
  // ==========================================

  async getGallery(params = {}) {
    let query = this.sb.from("gallery_images").select("*").order("created_at", { ascending: false })
    if (params.category) query = query.eq("category", params.category)
    const { data, error } = await query
    if (error) err(error.message)
    return ok(data)
  }

  async uploadGalleryImages(formData) {
    const { data: { user } } = await this.sb.auth.getUser()
    const files = formData.getAll("photos")
    const category = formData.get("category")
    const { data: profile } = await this.sb.from("profiles").select("rotaract_year").eq("id", user.id).single()
    const uploaded = []

    for (const file of files) {
      const ext = file.name.split(".").pop()
      const path = `gallery/${category || "general"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await this.sb.storage.from("photos").upload(path, file)
      if (uploadError) continue
      const { data: { publicUrl } } = this.sb.storage.from("photos").getPublicUrl(path)
      const { data: img } = await this.sb.from("gallery_images").insert({
        url: publicUrl,
        file_id: path,
        category,
        uploaded_by: user.id,
        rotaract_year: profile?.rotaract_year || "2025-2026",
      }).select().single()
      if (img) uploaded.push(img)
    }
    return ok(uploaded)
  }

  async deleteGalleryImage(id) {
    const { data: img } = await this.sb.from("gallery_images").select("file_id").eq("id", id).single()
    if (img?.file_id) await this.sb.storage.from("photos").remove([img.file_id])
    const { error } = await this.sb.from("gallery_images").delete().eq("id", id)
    if (error) err(error.message)
    return ok({ message: "Image deleted" })
  }

  // ==========================================
  // ARCHIVE
  // ==========================================

  async getArchives() {
    const { data, error } = await this.sb.from("archives").select("*").order("rotaract_year", { ascending: false })
    if (error) err(error.message)
    return ok(data)
  }

  async getArchiveByYear(year) {
    const { data, error } = await this.sb.from("archives").select("*").eq("rotaract_year", year).single()
    if (error) err(error.message)
    return ok(data)
  }

  async closeYear(data = {}) {
    const response = await fetch("/api/archive/close-year", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    if (!response.ok) err(result.error || "Failed to close year")
    return result
  }

  async startNewYear(data) {
    const response = await fetch("/api/archive/start-new-year", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    if (!response.ok) err(result.error || "Failed to start new year")
    return result
  }

  async addArchiveFile(year, formData) {
    const file = formData.get("file")
    if (!file) err("No file provided")
    const ext = file.name.split(".").pop()
    const path = `archive/${year}/${Date.now()}-${file.name}`
    const { error: uploadError } = await this.sb.storage.from("documents").upload(path, file)
    if (uploadError) err(uploadError.message)
    const { data: { publicUrl } } = this.sb.storage.from("documents").getPublicUrl(path)
    const { data: archive } = await this.sb.from("archives").select("files").eq("rotaract_year", year).single()
    const files = [...(archive?.files || []), { name: file.name, url: publicUrl, uploadedAt: new Date().toISOString() }]
    const { data: updated, error } = await this.sb.from("archives").update({ files }).eq("rotaract_year", year).select().single()
    if (error) err(error.message)
    return ok(updated)
  }

  // ==========================================
  // PUBLIC
  // ==========================================

  async getHomepage() {
    const { data, error } = await this.sb.from("club_settings").select("*").single()
    if (error) err(error.message)
    return ok(data)
  }

  async getAboutRotaract() {
    const { data, error } = await this.sb.from("club_settings").select("about_rotaract, areas_of_focus, established_year").single()
    if (error) err(error.message)
    return ok(data)
  }

  async getAboutClub() {
    const { data, error } = await this.sb.from("club_settings").select("*").single()
    if (error) err(error.message)
    return ok(data)
  }

  async getPublicGallery() {
    const { data, error } = await this.sb.from("gallery_images").select("*").order("created_at", { ascending: false })
    if (error) err(error.message)
    return ok(data)
  }

  async getPublicEvents(params = {}) {
    let query = this.sb.from("events").select("id,name,description,start_date,end_date,category,cover_image,status,venue,attendees").neq("status", "cancelled").order("start_date", { ascending: false })
    if (params.status) query = query.eq("status", params.status)
    const { data, error } = await query
    if (error) err(error.message)
    return ok(data)
  }

  async getPublicEvent(id) {
    const { data, error } = await this.sb
      .from("events")
      .select("id,name,description,start_date,end_date,category,cover_image,gallery,video_links,venue,attendees,status,report_link")
      .eq("id", id)
      .single()
    if (error) err(error.message)
    return ok(data)
  }

  async getContactInfo() {
    const { data, error } = await this.sb.from("club_settings").select("contact_email,contact_phone,address,meeting_schedule,google_map_url,social_media,contact_description").single()
    if (error) err(error.message)
    return ok(data)
  }

  async sendContactMessage(data) {
    const { data: msg, error } = await this.sb.from("contact_messages").insert(data).select().single()
    if (error) err(error.message)
    return ok(msg)
  }

  async getPublicBoard() {
    const year = await this._currentYear()
    return { success: true, data: await this._boardObject(year) }
  }

  // ==========================================
  // ASSET URL HELPER
  // ==========================================
  getAssetUrl(path) {
    if (!path) return null
    if (path.startsWith("http")) return path
    return path
  }
}

export const api = new ApiService()
export default api
