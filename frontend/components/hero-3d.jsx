"use client"

import Link from "next/link"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { DynamicContent } from "@/components/dynamic-content"
import { useClubSettings } from "@/contexts/club-settings-context"
import { Sparkles, ArrowRight, Users, Calendar, Heart, Globe } from "lucide-react"

// Interactive 3D hero. Pointer position drives CSS vars (--px,--py) on the root;
// the headline tilts in perspective and floating chips/orbs parallax at varying
// depths. Pure transform — no re-render, no 3D library. Static when idle / touch.
export function Hero3D() {
  const { settings } = useClubSettings()
  const year = settings?.currentRotaractYear || "2025–2026"
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--px", "0")
    el.style.setProperty("--py", "0")
  }

  const chips = [
    { icon: Users, label: "Members", pos: "left-[2%] top-[22%]", depth: 46 },
    { icon: Calendar, label: "Events", pos: "right-[3%] top-[16%]", depth: 64 },
    { icon: Heart, label: "Service", pos: "left-[7%] bottom-[14%]", depth: 56 },
    { icon: Globe, label: "Global Network", pos: "right-[5%] bottom-[18%]", depth: 40 },
  ]

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="hero3d relative overflow-hidden py-28 lg:py-40"
      style={{ "--px": 0, "--py": 0 }}
    >
      <div className="mesh-bg" />
      <div className="grid-overlay" />

      {/* parallax glow orbs */}
      <div className="hero3d-layer absolute -top-28 left-[6%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" style={{ "--depth": 22 }} />
      <div className="hero3d-layer absolute -bottom-24 right-[4%] h-80 w-80 rounded-full bg-accent/12 blur-3xl" style={{ "--depth": 16 }} />

      <div className="container relative">
        <div className="hero3d-stage relative mx-auto max-w-4xl text-center">
          {/* floating chips (desktop only) */}
          {chips.map((c, i) => (
            <div
              key={i}
              className={`hero3d-chip pointer-events-none absolute hidden lg:block ${c.pos}`}
              style={{ "--depth": c.depth }}
            >
              <div className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg">
                <c.icon className="h-4 w-4 text-primary" />
                {c.label}
              </div>
            </div>
          ))}

          <div className="hero3d-content">
            <span className="eyebrow animate-fade-up">
              <Sparkles className="h-3.5 w-3.5" /> Rotaract Year {year}
            </span>
            <h1
              className="mt-6 text-4xl font-semibold tracking-tight leading-[1.04] sm:text-6xl lg:text-[4.75rem] animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              <span className="block text-foreground">
                <DynamicContent field="homeHeroTitle" defaultText="Rotaract Club of" />
              </span>
              <span className="block mt-2 text-gradient">
                <DynamicContent field="homeHeroSubtitle" defaultText="Anand Institute of Higher Technology" />
              </span>
            </h1>
            <DynamicContent
              as="p"
              field="homeHeroDescription"
              className="mx-auto mt-7 max-w-2xl text-lg text-muted-foreground text-pretty animate-fade-up"
              defaultText="Building future leaders through community service, professional development, and creating lasting change in our communities. RID 3233."
            />
            <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-up" style={{ animationDelay: "220ms" }}>
              <Button size="lg" className="group" asChild>
                <Link href="/register">
                  Join the Club
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="glass" asChild>
                <Link href="/about-club">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* scroll cue */}
          <div className="mt-16 flex justify-center animate-fade-in" style={{ animationDelay: "500ms" }}>
            <span className="scroll-cue" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
