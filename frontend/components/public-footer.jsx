"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin, Twitter, Youtube, Globe } from "lucide-react"
import { useClubSettings } from "@/contexts/club-settings-context"

export function PublicFooter() {
  const [logoError, setLogoError] = useState(false)
  const currentYear = new Date().getFullYear()
  const { settings, getLogoSrc } = useClubSettings()

  const clubName = settings?.clubName || "Rotaract Club"
  const rid = settings?.rid || ""
  const contactEmail = settings?.contactEmail || ""
  const contactPhone = settings?.contactPhone || ""
  const address = settings?.address || ""
  const parentClubName = settings?.parentClubName || ""
  const currentRotaractYear = settings?.currentRotaractYear || ""
  const socialMedia = settings?.socialMedia || {}

  const logoUrl = settings?.clubLogo ? getLogoSrc(settings.clubLogo) : null
  const showLogo = logoUrl && !logoError

  // Reset logo error when logo URL changes
  useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-card/60 backdrop-blur">
      <div className="mesh-bg opacity-40" />
      <div className="container relative px-4 pt-12 pb-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Club Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {showLogo ? (
                <img
                  src={logoUrl}
                  alt={clubName}
                  className="h-10 w-10 rounded-full object-contain bg-secondary"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                  <span className="text-lg font-bold text-primary-foreground">R</span>
                </div>
              )}
              <div>
                <p className="font-semibold">{clubName}</p>
                {rid && <p className="text-xs text-muted-foreground">RID {rid}</p>}
              </div>
            </div>
            {settings?.missionStatement && (
              <p className="text-sm text-muted-foreground mb-4">
                {settings.missionStatement}
              </p>
            )}
            <div className="flex gap-3">
              {socialMedia.facebook && (
                <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {socialMedia.instagram && (
                <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {socialMedia.linkedin && (
                <a href={socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {socialMedia.twitter && (
                <a href={socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {socialMedia.youtube && (
                <a href={socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {socialMedia.website && (
                <a href={socialMedia.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about-rotaract" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Rotaract
                </Link>
              </li>
              <li>
                <Link href="/about-club" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Our Club
                </Link>
              </li>
              <li>
                <Link href="/board" className="text-muted-foreground hover:text-foreground transition-colors">
                  Current Board
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              {contactEmail && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${contactEmail}`} className="hover:text-foreground transition-colors">
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${contactPhone}`} className="hover:text-foreground transition-colors">
                    {contactPhone}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Parent Club */}
          <div>
            <h3 className="font-semibold mb-4">Parent Club</h3>
            {parentClubName && (
              <p className="text-sm text-muted-foreground mb-2">{parentClubName}</p>
            )}
            {rid && (
              <p className="text-xs text-muted-foreground">Rotary International District {rid}</p>
            )}
            {currentRotaractYear && (
              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground">Rotaract Year</p>
                <p className="font-semibold text-accent">{currentRotaractYear}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/60 text-center text-sm text-muted-foreground">
          <p>© {currentYear} {clubName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
