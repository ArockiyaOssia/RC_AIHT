"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// Scroll-reveal wrapper. Fades + slides its children in once they enter the
// viewport. Respects prefers-reduced-motion via the .reveal CSS rules.
export function Reveal({ children, className, delay = 0, as: Tag = "div", ...props }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </Tag>
  )
}
