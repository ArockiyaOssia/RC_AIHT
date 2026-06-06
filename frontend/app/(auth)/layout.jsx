"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useClubSettings } from "@/contexts/club-settings-context"

export default function AuthLayout({ children }) {
  const [logoError, setLogoError] = useState(false)
  const { isAuthenticated, isAdmin } = useAuth()
  const { settings, getLogoSrc } = useClubSettings()
  const homeHref = isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/"

  // Get club name parts
  const clubName = settings?.clubName || "Rotaract Club"
  const clubNameParts = clubName.split(" of ")
  const mainName = clubNameParts[0] || "Rotaract Club"
  const subName = clubNameParts[1] ? `of ${clubNameParts[1]}` : ""

  const logoUrl = settings?.clubLogo ? getLogoSrc(settings.clubLogo) : null
  const showLogo = logoUrl && !logoError

  // Reset logo error when logo URL changes
  useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className="mesh-bg" />
      <div className="grid-overlay" />
      {/* Simple Header */}
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="container px-4 h-16 flex items-center">
          <Link href={homeHref} className="flex items-center gap-3">
            {showLogo ? (
              <img
                src={logoUrl}
                alt={clubName}
                className="h-9 w-9 rounded-full object-contain bg-secondary"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent glow">
                <span className="text-lg font-bold text-primary-foreground">R</span>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{mainName}</p>
              {subName && <p className="text-xs text-muted-foreground">{subName}</p>}
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">{children}</main>

      {/* Simple Footer */}
      <footer className="relative z-10 border-t border-border/60 py-4">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {clubName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
