"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu, ChevronDown, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useClubSettings } from "@/contexts/club-settings-context"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about-rotaract", label: "About Rotaract" },
  { href: "/about-club", label: "About Our Club" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/board", label: "Current Board" },
  { href: "/contact", label: "Contact" },
]

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const { settings, getLogoSrc } = useClubSettings()

  // Logo link goes to dashboard/admin when logged in, otherwise home
  const logoHref = isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/"

  // Get club name parts
  const clubName = settings?.clubName || "Rotaract Club"
  const clubNameParts = clubName.split(" of ")
  const mainName = clubNameParts[0] || "Rotaract Club"
  const subName = clubNameParts[1] ? `of ${clubNameParts[1]}` : ""

  const logoUrl = settings?.clubLogo ? getLogoSrc(settings.clubLogo) : null
  const showLogo = logoUrl && !logoError

  // Reset logo error when logo URL changes
  useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="container flex h-16 items-center justify-between">
        <Link href={logoHref} className="flex items-center gap-3">
          {showLogo ? (
            <img
              src={logoUrl}
              alt={clubName}
              className="h-10 w-10 rounded-full object-contain bg-secondary"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent glow">
              <span className="text-lg font-bold text-primary-foreground">R</span>
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{mainName}</p>
            {subName && <p className="text-xs text-muted-foreground">{subName}</p>}
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthenticated && (
            <Button asChild size="sm" className="hidden sm:flex glow">
              <Link href="/register">Join</Link>
            </Button>
          )}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:flex bg-transparent items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.photo} alt={user?.firstName} />
                    <AvatarFallback className="text-xs">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                  <Badge variant="outline" className="text-xs mt-1 capitalize">
                    {user?.role || "Member"}
                  </Badge>
                </div>
                <DropdownMenuItem asChild>
                  <Link href={isAdmin ? "/admin" : "/dashboard"}>
                    {isAdmin ? "Admin Dashboard" : "Member Dashboard"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:flex bg-transparent">
                  Login <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/login">Member Login</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin-login">Admin Login</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[320px] bg-background overflow-y-auto">
              <SheetTitle className="sr-only">Main navigation</SheetTitle>
              <nav className="flex flex-col gap-4 mt-8 pb-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="border-border" />
                {isAuthenticated ? (
                  <>
                    <div className="px-3 py-2 flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photo} alt={user?.firstName} />
                        <AvatarFallback className="text-xs">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {user?.role || "Member"}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      href={isAdmin ? "/admin" : "/dashboard"}
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md"
                    >
                      {isAdmin ? "Admin Dashboard" : "Member Dashboard"}
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        logout()
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-md text-center"
                    >
                      Join the Club
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md"
                    >
                      Member Login
                    </Link>
                    <Link
                      href="/admin-login"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md"
                    >
                      Admin Login
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
