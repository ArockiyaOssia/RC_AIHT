"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  History,
  FileDown,
  Calendar,
  CalendarDays,
} from "lucide-react"
import api from "@/lib/api"
import { getSocket } from "@/lib/socket"

export default function MemberDashboardPage() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null)
      const response = await api.getMemberDashboard()
      setDashboardData(response.data)
    } catch (err) {
      console.error("Error fetching member dashboard:", err)
      setError("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Real-time updates for member dashboard
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // When member's own expense is approved/rejected/reimbursed, refresh
    socket.on("expense_approved_update", fetchDashboard)
    socket.on("expense_rejected_update", fetchDashboard)
    socket.on("reimbursement_notification", fetchDashboard)

    return () => {
      socket.off("expense_approved_update", fetchDashboard)
      socket.off("expense_rejected_update", fetchDashboard)
      socket.off("reimbursement_notification", fetchDashboard)
    }
  }, [fetchDashboard])

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "outline", className: "border-warning text-warning", icon: Clock },
      approved: { variant: "outline", className: "border-primary text-primary", icon: CheckCircle },
      rejected: { variant: "outline", className: "border-destructive text-destructive", icon: XCircle },
      reimbursed: { variant: "outline", className: "border-success text-success", icon: CheckCircle },
      paid: { variant: "outline", className: "border-success text-success", icon: CheckCircle },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge variant={config.variant} className={config.className}>
        <config.icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getCategoryLabel = (category) => {
    const labels = {
      donation: "Donation",
      personal_contribution: "Personal Contribution",
      travel_expense: "Travel",
      accommodation: "Accommodation",
      event_material: "Event Material",
      food_refreshments: "Food & Refreshments",
      miscellaneous: "Miscellaneous",
    }
    return labels[category] || category
  }

  const handleDownloadRecord = async () => {
    try {
      const response = await api.request("/members/export-record", {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `MyRecord_${user?.firstName || "Member"}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error("Error downloading record:", err)
      setError("Failed to download record")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchDashboard}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
          <p className="text-muted-foreground">
            Rotaract Year {dashboardData?.user?.rotaractYear || "2025-2026"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/expenses/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Submit Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contribution</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5" />
              {dashboardData?.summary?.totalContribution?.toLocaleString("en-IN") || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This year</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reimbursement</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center text-warning">
              <IndianRupee className="h-5 w-5" />
              {dashboardData?.summary?.pendingReimbursements?.toLocaleString("en-IN") || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved Expenses</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center text-success">
              <IndianRupee className="h-5 w-5" />
              {dashboardData?.summary?.approvedExpenses?.toLocaleString("en-IN") || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total approved</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected Entries</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {dashboardData?.summary?.rejectedExpenses || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Entries rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Expenses */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/expenses/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Submit New Expense
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/expenses">
                <History className="mr-2 h-4 w-4" /> View My Expenses
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/events">
                <CalendarDays className="mr-2 h-4 w-4" /> Browse Events
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
              <Link href="/dashboard/profile">
                <Avatar className="mr-2 h-4 w-4">
                  <AvatarFallback className="text-xs">P</AvatarFallback>
                </Avatar>
                Edit Profile
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" type="button" onClick={handleDownloadRecord}>
              <FileDown className="mr-2 h-4 w-4" /> Download My Record
            </Button>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Your latest expense submissions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/expenses">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recentExpenses?.length > 0 ? (
                dashboardData.recentExpenses.map((expense) => {
                  const eventName =
                    typeof expense.event === "string"
                      ? expense.event
                      : expense.event?.name || "Unknown event"
                  const amount =
                    typeof expense.amount === "number" ? expense.amount : 0

                  return (
                    <div
                      key={expense._id || expense.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{eventName}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCategoryLabel(expense.category)} •{" "}
                            {new Date(expense.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold flex items-center justify-end">
                          <IndianRupee className="h-3 w-3" />
                          {amount.toLocaleString("en-IN")}
                        </p>
                        {getStatusBadge(expense.status)}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No expenses submitted yet.</p>
                  <Button variant="link" asChild>
                    <Link href="/dashboard/expenses/new">Submit your first expense</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
