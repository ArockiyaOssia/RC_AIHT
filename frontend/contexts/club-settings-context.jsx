"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import api from "@/lib/api"

const ClubSettingsContext = createContext(null)

const SETTINGS_CACHE_KEY = "rcaiht_club_settings"

export function ClubSettingsProvider({ children }) {
  // Hydrate instantly from cache so branding paints without waiting on network.
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return null
    try {
      const cached = sessionStorage.getItem(SETTINGS_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(!settings)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.getSettings()
      setSettings(response.data)
      try {
        sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(response.data))
      } catch {}
    } catch (error) {
      console.error("Failed to fetch club settings:", error)
      // Only fall back to defaults if we have nothing cached
      setSettings((prev) =>
        prev || {
          clubName: "Rotaract Club",
          parentClubName: "",
          collegeName: "",
          clubLogo: null,
          rotaractLogo: null,
          parentClubLogo: null,
          collegeLogo: null,
        }
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSettings = useCallback(async () => {
    await fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Helper function to get logo URL
  const getLogoSrc = (logoPath) => {
    if (!logoPath) return null
    if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) return logoPath
    return logoPath
  }

  return (
    <ClubSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        getLogoSrc,
      }}
    >
      {children}
    </ClubSettingsContext.Provider>
  )
}

export function useClubSettings() {
  const context = useContext(ClubSettingsContext)
  if (!context) {
    throw new Error("useClubSettings must be used within a ClubSettingsProvider")
  }
  return context
}

