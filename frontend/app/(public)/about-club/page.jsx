"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useClubSettings } from "@/contexts/club-settings-context"
import { Calendar, MapPin, Users, Award, Star } from "lucide-react"
import { DynamicContent } from "@/components/dynamic-content"
import { PageHero } from "@/components/page-hero"





const achievements = [
  { year: "2024", title: "Best Community Service Project - District Award" },
  { year: "2023", title: "Most Outstanding Rotaract Club - RID 3233" },
  { year: "2022", title: "Excellence in Professional Development" },
  { year: "2021", title: "Best New Member Engagement" },
  { year: "2020", title: "COVID Relief Initiative Recognition" },
]

export default function AboutClubPage() {
  const { settings } = useClubSettings()
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <PageHero
        eyebrow={<DynamicContent as="span" field="establishedYear" defaultText="Established 2015" />}
        title={<>Rotaract Club of <span className="text-gradient">AIHT</span></>}
      >
        <DynamicContent
          as="p"
          field="aboutClubDescription"
          defaultText="A decade of service, leadership, and community impact. We are a community of young professionals and students united by our commitment to making a positive difference."
        />
      </PageHero>

      {/* Club Info */}
      <section className="py-16">
        <div className="container px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="glass card-lift border-border/60">
              <CardContent className="pt-6">
                <MapPin className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Location</h3>
                <p className="text-sm text-muted-foreground">
                  Anand Institute of Higher Technology
                  <br />
                  Chennai, Tamil Nadu
                  <br />
                  India
                </p>
              </CardContent>
            </Card>
            <Card className="glass card-lift border-border/60">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Parent Club</h3>
                <p className="text-sm text-muted-foreground">
                  Rotary Club of Chennai Silk City
                  <br />
                  Rotary International
                  <br />
                  RI District 3233
                </p>
              </CardContent>
            </Card>
            <Card className="glass card-lift border-border/60">
              <CardContent className="pt-6">
                <Calendar className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Meetings</h3>
                <p className="text-sm text-muted-foreground">
                  Every Saturday
                  <br />
                  5:00 PM - 7:00 PM
                  <br />
                  Online
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="relative overflow-hidden py-16 border-y border-border/60">
        <div className="mesh-bg opacity-50" />
        <div className="container relative px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <DynamicContent 
              as="div" 
              field="clubHistory" 
              className="prose prose-invert max-w-none text-muted-foreground" 
              defaultText="Rotaract Club of Apollo Institute of Hospital was chartered in 2014 with a vision to create a platform for young healthcare professionals and students to engage in meaningful community service while developing leadership skills.

Over the past decade, we have grown from a small group of 15 founding members to a vibrant community of over 50 active members. Our projects span healthcare awareness campaigns, blood donation drives, educational initiatives, and environmental conservation efforts.

What sets us apart is our unique position at the intersection of healthcare and community service. Our members bring specialized knowledge and passion to every project, making a measurable impact on the health and wellbeing of our community." 
            />
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="relative overflow-hidden py-16 border-y border-border/60">
        <div className="mesh-bg opacity-50" />
        <div className="container relative px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Achievements</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {(settings?.achievements && settings.achievements.length > 0) ? (
              settings.achievements.map((achievement, index) => (
                <div key={index} className="glass card-lift flex items-center gap-4 p-4 rounded-xl border border-border/60">
                  <div className="flex-shrink-0">
                    <Award className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{achievement.title}</p>
                  </div>
                  <Badge variant="outline" className="border-primary text-primary">
                    {achievement.year}
                  </Badge>
                </div>
              ))
             ) : (
              achievements.map((achievement, index) => (
                <div key={index} className="glass card-lift flex items-center gap-4 p-4 rounded-xl border border-border/60">
                  <div className="flex-shrink-0">
                    <Award className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{achievement.title}</p>
                  </div>
                  <Badge variant="outline" className="border-primary text-primary">
                    {achievement.year}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Legacy Stats */}
      <section className="py-16">
        <div className="container px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Legacy</h2>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 max-w-3xl mx-auto">
            {[
              { value: <DynamicContent field="statsYearsOfService" defaultText="10+" />, label: "Years of Service" },
              { value: <DynamicContent field="legacyProjectsCompleted" defaultText="200+" />, label: "Projects Completed" },
              { value: <DynamicContent field="legacyAlumniMembers" defaultText="500+" />, label: "Alumni Members" },
              { value: <DynamicContent field="legacyLivesImpacted" defaultText="50K+" />, label: "Lives Impacted" },
            ].map((stat, index) => (
              <div key={index} className="glass card-lift rounded-2xl p-5 text-center">
                <p className="text-4xl font-bold text-gradient">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container px-4">
          <div className="glass-strong relative mx-auto max-w-3xl overflow-hidden rounded-3xl p-10 text-center glow">
            <div className="mesh-bg opacity-70" />
            <div className="relative">
              <h2 className="text-2xl font-bold mb-4 sm:text-3xl">Be Part of Our <span className="text-gradient">Legacy</span></h2>
              <p className="text-muted-foreground mb-6">
                Join our community of young leaders and help us write the next chapter of service and impact.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button className="glow" asChild>
                  <Link href="/register">Join the Club</Link>
                </Button>
                <Button variant="outline" className="glass" asChild>
                  <Link href="/board">Meet Our Team</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
