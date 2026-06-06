"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

// Subtle 3D tilt + cursor sheen. Wrap any card. Pointer-driven, GPU transform,
// disabled for touch / reduced-motion (falls back to a static card).
export function TiltCard({ children, className, max = 6, ...props }) {
  const ref = useRef(null)

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty("--rx", `${((0.5 - py) * max * 2).toFixed(2)}deg`)
    el.style.setProperty("--ry", `${((px - 0.5) * max * 2).toFixed(2)}deg`)
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`)
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`)
  }

  const handleLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty("--rx", "0deg")
    el.style.setProperty("--ry", "0deg")
  }

  return (
    <div className="tilt-perspective h-full">
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={cn("tilt-card h-full", className)}
        {...props}
      >
        <span className="tilt-sheen" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}
