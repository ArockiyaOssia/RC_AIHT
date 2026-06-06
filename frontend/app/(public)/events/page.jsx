"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users } from "lucide-react"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { TiltCard } from "@/components/tilt-card"
import api from "@/lib/api"

const categoryLabels = {
  community_service: "Community Service",
  professional_development: "Professional Development",
  international_service: "International Service",
  club_service: "Club Service",
  fundraising: "Fundraising",
  social: "Social",
  installation: "Installation",
  other: "Other",
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const response = await api.getPublicEvents({ limit: 24 })
        const data = response.data?.events || []
        setEvents(data)
      } catch (error) {
        console.error("Error fetching public events:", error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return (
    <div className="flex flex-col">
      <PageHero
        eyebrow="What we do"
        title={<>Public <span className="text-gradient">Events</span></>}
      >
        Explore all our events open for public viewing.
      </PageHero>

      <section className="py-12">
        <div className="container px-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No public events available right now.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <Reveal key={event._id} delay={(i % 3) * 80}>
                <TiltCard className="glass border-border/60 rounded-[var(--radius)]" max={5}>
                <Card className="bg-transparent border-0 shadow-none h-full">
                  <CardHeader className="space-y-2">
                    <Badge variant="outline" className="w-fit capitalize">
                      {categoryLabels[event.category] || event.category}
                    </Badge>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        -{" "}
                        {new Date(event.endDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {event.venue?.name || event.venue?.city || "Venue to be announced"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {event.attendees || 0} attendees
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {event.description || "No event description available."}
                    </p>

                    {Array.isArray(event.tags) && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/events/${event._id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
                </TiltCard>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
