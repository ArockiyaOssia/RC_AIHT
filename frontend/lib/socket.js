import { getSupabase } from "@/lib/supabase"

let _channel = null

export function getRealtimeChannel(channelName = "rotaract-notifications") {
  if (typeof window === "undefined") return null
  const supabase = getSupabase()
  if (!_channel) {
    _channel = supabase.channel(channelName)
  }
  return _channel
}

export function subscribeToExpenses(callback) {
  const supabase = getSupabase()
  return supabase
    .channel("expenses-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, callback)
    .subscribe()
}

export function subscribeToEvents(callback) {
  const supabase = getSupabase()
  return supabase
    .channel("events-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, callback)
    .subscribe()
}

export function subscribeToMessages(callback) {
  const supabase = getSupabase()
  return supabase
    .channel("messages-changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "contact_messages" }, callback)
    .subscribe()
}

export function unsubscribe(channel) {
  if (channel) {
    const supabase = getSupabase()
    supabase.removeChannel(channel)
  }
}

export function disconnectSocket() {
  if (_channel) {
    const supabase = getSupabase()
    supabase.removeChannel(_channel)
    _channel = null
  }
}

// Legacy compatibility
export const getSocket = () => null
