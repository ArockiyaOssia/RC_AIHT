"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import api from "@/lib/api"

const ClubSettingsContext = createContext(null)

export function ClubSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.getSettings()
      setSettings(response.data)
    } catch (error) {
      console.error("Failed to fetch club settings:", error)
      // Set default fallback values
      setSettings({
        clubName: "Rotaract Club",
        parentClubName: "",
        collegeName: "",
        clubLogo: null,
        rotaractLogo: null,
        parentClubLogo: null,
        collegeLogo: null,
      })
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

