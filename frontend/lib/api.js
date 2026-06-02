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

    const totalExpenses = statsData?.reduce((s, e) => s + Number(e.amount), 0) || 0
    const pendingCount = statsData?.filter(e => e.status === "pending").length || 0
    const approvedCount = statsData?.filter(e => e.status === "approved").length || 0

    return ok({
      profile: profileRes.data,
      recentExpenses: expensesRes.data || [],
      recentEvents: eventsRes.data || [],
      stats: { totalExpenses, pendingCount, approvedCount, totalCount: statsData?.length || 0 },
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
    const { data, error } = await this.sb.from("expenses").select("*, event:events(id,name,start_date), member:profiles(id,first_name,last_name)").eq("id", id).single()
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
      .select("*, event:events(id,name,start_date), member:profiles(id,first_name,last_name,photo)")
      .eq("id", id)
      .single()
    if (error) err(error.message)
    return ok(data)
  }

  async getAllExpenses(params = {}) {
    let query = this.sb
      .from("expenses")
      .select("*, event:events(id,name,start_date), member:profiles(id,first_name,last_name,photo,member_id)")
      .order("created_at", { ascending: false })

    if (params.status) query = query.eq("status", params.status)
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    if (params.eventId) query = query.eq("event", params.eventId)

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
      ...data,
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
    let query = this.sb.from("events").select("*, coordinator:profiles(id,first_name,last_name)").order("start_date", { ascending: false })
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
      .select("*, coordinator:profiles(id,first_name,last_name)")
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

  async getAdminDashboard() {
    const [membersRes, eventsRes, expensesRes, messagesRes] = await Promise.all([
      this.sb.from("profiles").select("id, is_active, role, created_at", { count: "exact" }),
      this.sb.from("events").select("id, status", { count: "exact" }),
      this.sb.from("expenses").select("id, status, amount"),
      this.sb.from("contact_messages").select("id, is_read", { count: "exact" }).eq("is_read", false),
    ])

    const totalExpenses = expensesRes.data?.reduce((s, e) => s + Number(e.amount), 0) || 0
    const pendingExpenses = expensesRes.data?.filter(e => e.status === "pending").length || 0
    const activeMembers = membersRes.data?.filter(m => m.is_active).length || 0

    return ok({
      totalMembers: membersRes.count || 0,
      activeMembers,
      totalEvents: eventsRes.count || 0,
      upcomingEvents: eventsRes.data?.filter(e => e.status === "upcoming").length || 0,
      totalExpenseAmount: totalExpenses,
      pendingExpenses,
      unreadMessages: messagesRes.count || 0,
    })
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

  async getCurrentBoard() {
    const { data: settings } = await this.sb.from("club_settings").select("current_rotaract_year").single()
    const year = settings?.current_rotaract_year || "2025-2026"
    const { data, error } = await this.sb
      .from("board_members")
      .select("*, member:profiles(id,first_name,last_name,photo,role)")
      .eq("rotaract_year", year)
      .order("display_order")
    if (error) err(error.message)
    return ok(data)
  }

  async getBoardHistory() {
    const { data, error } = await this.sb
      .from("board_members")
      .select("rotaract_year")
      .order("rotaract_year", { ascending: false })
    if (error) err(error.message)
    const years = [...new Set(data?.map(b => b.rotaract_year) || [])]
    return ok(years)
  }

  async getBoardByYear(year) {
    const { data, error } = await this.sb
      .from("board_members")
      .select("*, member:profiles(id,first_name,last_name,photo)")
      .eq("rotaract_year", year)
      .order("display_order")
    if (error) err(error.message)
    return ok(data)
  }

  // Only these columns exist on board_members
  static BOARD_COLS = ["member_id", "role", "display_order", "photo", "photo_id", "name", "department", "email", "phone"]

  _pickBoardCols(obj) {
    const snake = toSnake(obj, { strip: true })
    const out = {}
    for (const c of ApiService.BOARD_COLS) if (snake[c] !== undefined) out[c] = snake[c]
    return out
  }

  async createOrUpdateBoard(data) {
    const { members, rotaractYear } = data
    if (!members || !rotaractYear) err("members and rotaractYear required")
    // Delete existing board for that year and re-insert
    await this.sb.from("board_members").delete().eq("rotaract_year", rotaractYear)
    const rows = members.map((m, i) => ({ ...this._pickBoardCols(m), rotaract_year: rotaractYear, display_order: i }))
    const { data: inserted, error } = await this.sb.from("board_members").insert(rows).select()
    if (error) err(error.message)
    return ok(inserted)
  }

  async updateBoardMember(data) {
    if (data instanceof FormData) {
      const id = data.get("id")
      const file = data.get("photo")
      let photoUrl = data.get("existingPhoto")
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop()
        const path = `board/${id}-${Date.now()}.${ext}`
        await this.sb.storage.from("photos").upload(path, file, { upsert: true })
        const { data: { publicUrl } } = this.sb.storage.from("photos").getPublicUrl(path)
        photoUrl = publicUrl
      }
      const raw = Object.fromEntries(data)
      delete raw.existingPhoto
      const payload = this._pickBoardCols(raw)
      if (photoUrl) payload.photo = photoUrl
      const { data: updated, error } = await this.sb.from("board_members").update(payload).eq("id", id).select().single()
      if (error) err(error.message)
      return ok(updated)
    }
    const payload = this._pickBoardCols(data)
    const { data: updated, error } = await this.sb.from("board_members").update(payload).eq("id", data.id || data._id).select().single()
    if (error) err(error.message)
    return ok(updated)
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

  async getFinancialSummary(params = {}) {
    let query = this.sb.from("expenses").select("amount, status, category, date, rotaract_year")
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    const { data, error } = await query
    if (error) err(error.message)

    const summary = {
      total: data?.reduce((s, e) => s + Number(e.amount), 0) || 0,
      approved: data?.filter(e => e.status === "approved").reduce((s, e) => s + Number(e.amount), 0) || 0,
      pending: data?.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0) || 0,
      reimbursed: data?.filter(e => e.status === "reimbursed").reduce((s, e) => s + Number(e.amount), 0) || 0,
      byCategory: {},
      byMonth: {},
    }
    data?.forEach(e => {
      summary.byCategory[e.category] = (summary.byCategory[e.category] || 0) + Number(e.amount)
      const month = new Date(e.date).toLocaleString("default", { month: "short", year: "numeric" })
      summary.byMonth[month] = (summary.byMonth[month] || 0) + Number(e.amount)
    })
    return ok(summary)
  }

  async getMemberWiseReport(params = {}) {
    let query = this.sb
      .from("expenses")
      .select("amount, status, member:profiles(id,first_name,last_name,member_id)")
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    const { data, error } = await query
    if (error) err(error.message)

    const memberMap = {}
    data?.forEach(e => {
      const id = e.member?.id
      if (!id) return
      if (!memberMap[id]) memberMap[id] = { member: e.member, total: 0, approved: 0, count: 0 }
      memberMap[id].total += Number(e.amount)
      memberMap[id].count++
      if (e.status === "approved") memberMap[id].approved += Number(e.amount)
    })
    return ok(Object.values(memberMap))
  }

  async getEventWiseReport(params = {}) {
    let query = this.sb
      .from("expenses")
      .select("amount, status, event:events(id,name,category,start_date)")
    if (params.rotaractYear) query = query.eq("rotaract_year", params.rotaractYear)
    const { data, error } = await query
    if (error) err(error.message)

    const eventMap = {}
    data?.forEach(e => {
      const id = e.event?.id
      if (!id) return
      if (!eventMap[id]) eventMap[id] = { event: e.event, total: 0, count: 0 }
      eventMap[id].total += Number(e.amount)
      eventMap[id].count++
    })
    return ok(Object.values(eventMap))
  }

  async getLeaderboard() {
    const { data, error } = await this.sb
      .from("expenses")
      .select("amount, member:profiles(id,first_name,last_name,photo,member_id)")
      .eq("status", "approved")
    if (error) err(error.message)

    const memberMap = {}
    data?.forEach(e => {
      const id = e.member?.id
      if (!id) return
      if (!memberMap[id]) memberMap[id] = { member: e.member, total: 0 }
      memberMap[id].total += Number(e.amount)
    })
    return ok(Object.values(memberMap).sort((a, b) => b.total - a.total).slice(0, 10))
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
    const { data: settings } = await this.sb.from("club_settings").select("current_rotaract_year").single()
    const year = settings?.current_rotaract_year || "2025-2026"
    const { data, error } = await this.sb
      .from("board_members")
      .select("*, member:profiles(id,first_name,last_name,photo)")
      .eq("rotaract_year", year)
      .order("display_order")
    if (error) err(error.message)
    return ok(data)
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
