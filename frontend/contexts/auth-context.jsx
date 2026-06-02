"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null)
      setUser(null)
      return
    }
    const supabase = getSupabase()
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single()

    if (data) {
      setProfile(data)
      setUser({ ...authUser, ...data, email: authUser.email })
    } else {
      setUser(authUser)
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const login = async ({ email, password }) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setUser({ ...data.user, ...profileData, email: data.user.email })
      // Update last login
      await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", data.user.id)
    }

    return { data: { user: profileData } }
  }

  const adminLogin = async ({ email, password }) => {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (!profileData?.is_admin) {
      await supabase.auth.signOut()
      throw new Error("Access denied. Admin privileges required.")
    }

    setProfile(profileData)
    setUser({ ...data.user, ...profileData, email: data.user.email })
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", data.user.id)

    return { data: { user: profileData } }
  }

  const logout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push("/")
  }

  const isAdmin = profile?.is_admin === true
  const isTreasurer = profile?.role === "treasurer"
  const isPresident = profile?.role === "president"

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        adminLogin,
        logout,
        isAdmin,
        isTreasurer,
        isPresident,
        isAuthenticated: !!user,
        refreshProfile: () => user && fetchProfile(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
