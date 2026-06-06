"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useClubSettings } from "@/contexts/club-settings-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  History,
  User,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Users,
  Calendar,
  Archive,
  Shield,
  BarChart3,
  Mail,
  Image as ImageIcon,
  UserPlus,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const memberNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Events",
    href: "/dashboard/events",
    icon: Calendar,
  },
  {
    title: "Expenses",
    icon: Receipt,
    children: [
      { title: "Submit Expense", href: "/dashboard/expenses/new", icon: PlusCircle },
      { title: "My Expenses", href: "/dashboard/expenses", icon: History },
    ],
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
]

const adminNavItems = [
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
  },
  {
    title: "Expenses",
    icon: Receipt,
    children: [
      { title: "All Expenses", href: "/admin/expenses", icon: History },
      { title: "Add Manual", href: "/admin/expenses/manual", icon: PlusCircle },
    ],
  },
  {
    title: "Members",
    href: "/admin/members",
    icon: Users,
  },
  {
    title: "Registrations",
    href: "/admin/registrations",
    icon: UserPlus,
  },
  {
    title: "Events",
    href: "/admin/events",
    icon: Calendar,
  },
  {
    title: "Board",
    href: "/admin/board",
    icon: Users,
  },
  {
    title: "Gallery",
    href: "/admin/gallery",
    icon: ImageIcon,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Messages",
    href: "/admin/messages",
    icon: Mail,
  },
  {
    title: "Archive",
    href: "/admin/archive",
    icon: Archive,
  },
  {
    title: "Profile",
    href: "/admin/profile",
    icon: User,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
]

function NavItem({ item, pathname, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const isActive = item.href === pathname || item.children?.some((c) => c.href === pathname)

  if (item.children) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.title}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-4 mt-1 space-y-1">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === child.href
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <child.icon className="h-4 w-4" />
              {child.title}
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        pathname === item.href
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.title}
    </Link>
  )
}

function SidebarContent({ isAdmin, onNavigate }) {
  const [logoError, setLogoError] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { settings, getLogoSrc } = useClubSettings()
  const navItems = isAdmin ? adminNavItems : memberNavItems
  const homeHref = isAdmin ? "/admin" : "/dashboard"

  // Get club name parts
  const clubName = settings?.clubName || "Rotaract Club"
  const clubNameParts = clubName.split(" of ")
  const mainName = clubNameParts[0] || "Rotaract"
  const subName = clubNameParts[1] ? `Club of ${clubNameParts[1]}` : "Club"

  const logoUrl = settings?.clubLogo ? getLogoSrc(settings.clubLogo) : null
  const showLogo = logoUrl && !logoError

  // Reset logo error when logo URL changes
  useEffect(() => {
    setLogoError(false)
  }, [logoUrl])

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link href={homeHref} className="flex items-center gap-3" onClick={onNavigate}>
          {showLogo ? (
            <img
              src={logoUrl}
              alt={clubName}
              className="h-8 w-8 rounded-full object-contain bg-secondary"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary">
              <span className="text-sm font-bold text-sidebar-primary-foreground">R</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold leading-tight text-sidebar-foreground">{mainName}</p>
            <p className="text-xs text-muted-foreground">{subName}</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.photo || "/placeholder.svg"} alt={user?.firstName} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <Badge variant="outline" className="text-xs capitalize border-sidebar-border">
              {user?.role || "Member"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.title} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => {
            onNavigate?.()
            logout()
          }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}

export function DashboardSidebar({ isAdmin = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const { settings } = useClubSettings()
  const { logout } = useAuth()
  const clubName = settings?.clubName || "Rotaract Club"

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-16 items-center border-b border-border bg-background px-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 bg-sidebar overflow-y-auto">
            <div className="flex h-16 items-center border-b border-border px-6">
              <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
            </div>
            <SidebarContent isAdmin={isAdmin} onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="ml-3">
          <p className="text-sm font-semibold">{clubName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={logout}
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent isAdmin={isAdmin} />
      </aside>
    </>
  )
}
