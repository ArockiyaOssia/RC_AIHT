import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { TiltCard } from "@/components/tilt-card"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Current Board | Rotaract Club of AIHT",
  description: "Meet the current board members of Rotaract Club of AIHT.",
}

async function getCurrentBoard() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: settings } = await supabase
      .from("club_settings")
      .select("current_rotaract_year")
      .single()
    const year = settings?.current_rotaract_year || "2025-2026"
    const { data: rows } = await supabase
      .from("board_members")
      .select("*")
      .eq("rotaract_year", year)
      .order("display_order")
    return {
      rotaractYear: year,
      members: (rows || []).map((r) => ({
        position: r.role,
        name: r.name,
        photo: r.photo,
        email: r.email,
        phone: r.phone,
      })),
    }
  } catch (e) {
    return null
  }
}

const formatRole = (position) => {
  if (!position) return "Board Member"
  return position
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const getImageUrl = (photoStr) => {
  if (!photoStr) return "/placeholder.svg"
  if (photoStr.startsWith("http")) return photoStr

  // Construct backend base URL from API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  const baseUrl = apiUrl.startsWith("http")
    ? new URL(apiUrl).origin
    : "http://localhost:5000"

  // Ensure path is properly prefixed with baseUrl
  // If it starts with /, it's already an absolute-path relative to the server root
  if (photoStr.startsWith("/")) {
    return `${baseUrl}${photoStr}`
  }

  // Otherwise assume it needs /uploads/ prefix
  return `${baseUrl}/uploads/${photoStr}`
}

export default async function BoardPage() {
  const board = await getCurrentBoard()
  const members = Array.isArray(board?.members) ? board.members : []

  if (!board || members.length === 0) {
    return (
      <div className="flex flex-col">
        <PageHero
          eyebrow="Leadership"
          title={<>Current <span className="text-gradient">Board</span></>}
        >
          Current board details are not available yet.
        </PageHero>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <PageHero
        eyebrow="Leadership"
        title={<>Current <span className="text-gradient">Board</span></>}
      >
        Meet the board members for Rotaract Year {board.rotaractYear}.
      </PageHero>

      {/* Board Members Grid */}
      <section className="py-16">
        <div className="container px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
            {members.map((member, index) => (
              <Reveal key={`${member.position || "member"}-${index}`} delay={(index % 4) * 70}>
              <TiltCard className="rounded-[var(--radius)] overflow-hidden" max={5}>
              <Card
                className="group glass border-border/60 overflow-hidden flex flex-col h-full"
              >
                {/* Image Section - Showing Full Image */}
                <div className="relative h-80 w-full overflow-hidden bg-muted flex items-center justify-center">
                  {/* Blurred background to fill space */}
                  <img
                    src={getImageUrl(member.photo)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110"
                    aria-hidden="true"
                  />
                  {/* Main centered full image */}
                  <img
                    src={getImageUrl(member.photo)}
                    alt={member.name}
                    className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                
                {/* Content Section */}
                <CardContent className="p-6 flex-grow flex flex-col">
                  <div className="mb-4">
                    <Badge variant="secondary" className="mb-2 px-2 py-0 text-[10px] uppercase font-bold tracking-widest text-primary border-primary/20">
                      {formatRole(member.position)}
                    </Badge>
                    <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {member.name || "Board Member"}
                    </h3>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-3">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2.5 min-w-0"
                        title={member.email}
                      >
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2.5"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs">{member.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
