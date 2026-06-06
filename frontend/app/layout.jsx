import { Plus_Jakarta_Sans, Bricolage_Grotesque, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { ClubSettingsProvider } from "@/contexts/club-settings-context"
import { DynamicTitle } from "@/components/dynamic-title"
import { DynamicFavicon } from "@/components/dynamic-favicon"
import "./globals.css"

// Body: clean, modern, characterful (not generic Inter).
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})
// Display: distinctive grotesque for headings — premium + friendly.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
})

export const metadata = {
  title: "Rotaract Club Management System",
  description: "Complete club management system for Rotaract clubs - manage members, expenses, events, and more.",
  generator: 'v0.app'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${display.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ClubSettingsProvider>
            <DynamicTitle />
            <DynamicFavicon />
            {children}
          </ClubSettingsProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
