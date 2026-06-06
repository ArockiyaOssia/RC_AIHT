import { cn } from "@/lib/utils"

// Shared hero band for public pages: aurora mesh + dotted grid, eyebrow chip,
// big gradient-accented title, and optional description (children).
export function PageHero({ eyebrow, title, children, className }) {
  return (
    <section className={cn("relative overflow-hidden border-b border-border/60 py-20 lg:py-28", className)}>
      <div className="mesh-bg" />
      <div className="grid-overlay" />
      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow && (
            <span className="eyebrow animate-fade-up">{eyebrow}</span>
          )}
          <h1
            className="mt-5 text-4xl font-bold tracking-tight leading-tight sm:text-5xl lg:text-6xl animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            {title}
          </h1>
          {children && (
            <div
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
