"use client"

import Link from "next/link"
import { useClubSettings } from "@/contexts/club-settings-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Heart, Globe, ArrowRight, Award, Target, Sparkles } from "lucide-react"
import { DynamicContent } from "@/components/dynamic-content"
import { Reveal } from "@/components/reveal"
import { TiltCard } from "@/components/tilt-card"
import { Hero3D } from "@/components/hero-3d"

export default function HomePage() {
  const { settings } = useClubSettings()

  const stats = [
    { label: "Active Members", value: <DynamicContent field="statsActiveMembers" defaultText="50+" />, icon: Users },
    { label: "Events This Year", value: <DynamicContent field="statsEventsThisYear" defaultText="25+" />, icon: Calendar },
    { label: "Service Hours", value: <DynamicContent field="statsServiceHours" defaultText="1000+" />, icon: Heart },
    { label: "Years of Service", value: <DynamicContent field="statsYearsOfService" defaultText="10+" />, icon: Award },
  ]

  const defaultAreas = [
    { title: "Community Service", description: "Local projects addressing community needs and creating lasting impact.", icon: Heart },
    { title: "Professional Development", description: "Workshops, seminars, and networking opportunities for career growth.", icon: Award },
    { title: "International Service", description: "Collaborating with Rotaract clubs worldwide for global initiatives.", icon: Globe },
    { title: "Club Service", description: "Building fellowship and strengthening our club community.", icon: Users },
  ]
  const areas =
    settings?.areasOfFocus && settings.areasOfFocus.length > 0
      ? settings.areasOfFocus.map((a, i) => ({ ...a, icon: [Heart, Award, Globe, Users][i % 4] || Heart }))
      : defaultAreas

  return (
    <div className="flex flex-col">
      {/* ── Interactive 3D Hero ──────────────────── */}
      <Hero3D />

      {/* ── Stats ────────────────────────────────── */}
      <section className="relative border-y border-border/60 py-14">
        <div className="container">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {stats.map((stat, index) => (
              <Reveal key={index} delay={index * 90}>
                <TiltCard className="glass rounded-2xl p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <p className="font-display text-4xl font-semibold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ─────────────────────── */}
      <section className="py-24">
        <div className="container">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Our <span className="text-gradient">Purpose</span>
            </h2>
            <p className="mt-3 text-muted-foreground">அறம் வழி அறம் வளர்த்து</p>
          </Reveal>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Reveal>
              <Card className="glass card-lift h-full">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Target className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicContent
                    as="p"
                    field="missionStatement"
                    className="text-muted-foreground min-h-[4rem] leading-relaxed"
                    defaultText="To develop young professionals and students as leaders in their communities by encouraging high ethical standards, providing opportunities for professional development, and promoting service to others."
                  />
                </CardContent>
              </Card>
            </Reveal>
            <Reveal delay={120}>
              <Card className="glass card-lift h-full">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <DynamicContent
                    as="p"
                    field="visionStatement"
                    className="text-muted-foreground min-h-[4rem] leading-relaxed"
                    defaultText="To be a catalyst for positive change in our community by empowering young professionals to take action, build meaningful connections, and create sustainable impact through service and leadership."
                  />
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Areas of Focus ───────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/60 py-24">
        <div className="mesh-bg opacity-60" />
        <div className="container relative">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Areas of <span className="text-gradient">Focus</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Making a difference in what matters most</p>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area, index) => (
              <Reveal key={index} delay={(index % 3) * 90}>
                <TiltCard className="glass group rounded-[var(--radius)] p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
                    <area.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{area.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{area.description}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <Reveal>
            <div className="glass-strong relative mx-auto max-w-4xl overflow-hidden rounded-3xl p-10 text-center sm:p-14 glow">
              <div className="mesh-bg opacity-70" />
              <div className="relative">
                <h2 className="text-3xl font-bold sm:text-4xl">
                  Join Our <span className="text-gradient">Community</span>
                </h2>
                <DynamicContent
                  as="p"
                  field="joinCommunityText"
                  className="mx-auto mt-4 max-w-xl text-muted-foreground"
                  defaultText="Be part of a global network of young leaders making a difference. Join Rotaract Club of AIHT and start your journey of service and leadership."
                />
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Button size="lg" className="glow group" asChild>
                    <Link href="/register">
                      Register Now
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="glass" asChild>
                    <Link href="/contact">Get in Touch</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
