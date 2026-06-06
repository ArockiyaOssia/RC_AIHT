import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Globe, Users, Heart, Award } from "lucide-react"
import { DynamicContent } from "@/components/dynamic-content"
import { PageHero } from "@/components/page-hero"

export const metadata = {
  title: "About Rotaract | Rotaract Club of AIH",
  description:
    "Learn about Rotaract International - a global network of young leaders taking action to build a better world.",
}

export default function AboutRotaractPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <PageHero
        eyebrow="About Rotaract"
        title={<>What is <span className="text-gradient">Rotaract</span>?</>}
      >
        <DynamicContent
          as="p"
          field="aboutRotaract"
          defaultText="Rotaract is a global network of young leaders who are committed to making a difference in their communities. With over 10,000 clubs worldwide, we are united by a shared vision of service above self."
        />
      </PageHero>

      {/* Overview */}
      <section className="py-16">
        <div className="container px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">A Global Community</h2>
              <p className="text-muted-foreground mb-4">
                Rotaract clubs bring together people ages 18 and older to exchange ideas with leaders in the community,
                develop leadership and professional skills, and have fun through service.
              </p>
              <p className="text-muted-foreground mb-4">
                In communities worldwide, Rotary and Rotaract members work side by side to take action through service.
                From global service projects to local community initiatives, Rotaractors are making an impact.
              </p>
              <p className="text-muted-foreground mb-6">
                As a Rotaractor, you can address the causes you care about while developing skills, gaining real
                experience, and making connections across the globe.
              </p>
              <Button asChild>
                <a
                  href="https://www.rotary.org/en/get-involved/rotaract-clubs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn More at Rotary.org <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass card-lift border-border/60">
                <CardContent className="pt-6">
                  <Globe className="h-10 w-10 text-primary mb-3" />
                  <p className="text-3xl font-bold text-accent">180+</p>
                  <p className="text-sm text-muted-foreground">Countries</p>
                </CardContent>
              </Card>
              <Card className="glass card-lift border-border/60">
                <CardContent className="pt-6">
                  <Users className="h-10 w-10 text-primary mb-3" />
                  <p className="text-3xl font-bold text-accent">200K+</p>
                  <p className="text-sm text-muted-foreground">Members</p>
                </CardContent>
              </Card>
              <Card className="glass card-lift border-border/60">
                <CardContent className="pt-6">
                  <Award className="h-10 w-10 text-primary mb-3" />
                  <p className="text-3xl font-bold text-accent">10K+</p>
                  <p className="text-sm text-muted-foreground">Clubs</p>
                </CardContent>
              </Card>
              <Card className="glass card-lift border-border/60">
                <CardContent className="pt-6">
                  <Heart className="h-10 w-10 text-primary mb-3" />
                  <p className="text-3xl font-bold text-accent">1929</p>
                  <p className="text-sm text-muted-foreground">Founded</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Rotary Connection */}
      <section className="relative overflow-hidden py-16 border-y border-border/60">
        <div className="mesh-bg opacity-50" />
        <div className="container relative px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Rotary Connection</h2>
            <p className="text-muted-foreground">
              Rotaract is sponsored by Rotary International, one of the world's largest and most successful humanitarian
              organizations.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="glass card-lift border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Rotary International</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A global network of 1.4 million neighbors, friends, leaders, and problem-solvers who see a world where
                  people unite and take action to create lasting change.
                </p>
              </CardContent>
            </Card>
            <Card className="glass card-lift border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Rotary Clubs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Local Rotary clubs sponsor Rotaract clubs, providing mentorship, guidance, and support for young
                  leaders in their communities.
                </p>
              </CardContent>
            </Card>
            <Card className="glass card-lift border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Interact Clubs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  For students ages 12-18, Interact clubs provide a pathway to leadership and service before joining
                  Rotaract.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Areas of Focus */}
      <section className="py-16">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Rotary Areas of Focus</h2>
            <p className="text-muted-foreground">
              Rotary directs resources towards seven areas where we can have the greatest and most sustainable impact.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Promoting Peace", color: "bg-blue-500/10 text-blue-400" },
              { title: "Fighting Disease", color: "bg-red-500/10 text-red-400" },
              { title: "Providing Clean Water", color: "bg-cyan-500/10 text-cyan-400" },
              { title: "Saving Mothers & Children", color: "bg-pink-500/10 text-pink-400" },
              { title: "Supporting Education", color: "bg-amber-500/10 text-amber-400" },
              { title: "Growing Local Economies", color: "bg-green-500/10 text-green-400" },
              { title: "Protecting the Environment", color: "bg-emerald-500/10 text-emerald-400" },
            ].map((area, index) => (
              <div key={index} className={`p-4 rounded-lg border border-border ${area.color}`}>
                <p className="font-medium text-sm">{area.title}</p>
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
              <h2 className="text-2xl font-bold mb-4 sm:text-3xl">Ready to Make a <span className="text-gradient">Difference</span>?</h2>
              <p className="text-muted-foreground mb-6">
                Join Rotaract Club of AIHT and be part of this global movement of young leaders.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button className="glow" asChild>
                  <Link href="/register">Join the Club</Link>
                </Button>
                <Button variant="outline" className="glass" asChild>
                  <Link href="/about-club">About Our Club</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
