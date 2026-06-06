"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Mail, Phone, GraduationCap, Check, X, UserPlus, AlertCircle, Clock, KeyRound,
} from "lucide-react"
import api from "@/lib/api"

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

export default function AdminRegistrationsPage() {
  const [tab, setTab] = useState("pending")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null) // { type, text }
  const [manualCreds, setManualCreds] = useState(null) // { email, password, memberId }
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  const load = async (status = tab) => {
    try {
      setLoading(true)
      const res = await api.getRegistrations(status)
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Failed to load registrations" })
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const approve = async (row) => {
    setBusyId(row._id)
    setNotice(null)
    try {
      const res = await api.approveRegistration(row._id)
      if (res.emailSent) {
        setNotice({ type: "success", text: `Approved ${row.email}. Login details emailed.` })
      } else if (res.credentials) {
        // Email not configured / failed — surface credentials so admin can relay them.
        setManualCreds(res.credentials)
        setNotice({ type: "warn", text: `Approved, but email didn't send. Share the credentials below manually.` })
      } else {
        setNotice({ type: "success", text: `Approved ${row.email}.` })
      }
      load(tab)
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Approve failed" })
    } finally {
      setBusyId(null)
    }
  }

  const doReject = async () => {
    if (!rejectTarget) return
    setBusyId(rejectTarget._id)
    try {
      await api.rejectRegistration(rejectTarget._id, rejectReason)
      setNotice({ type: "success", text: `Rejected ${rejectTarget.email}.` })
      setRejectTarget(null)
      setRejectReason("")
      load(tab)
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Reject failed" })
    } finally {
      setBusyId(null)
    }
  }

  const fullName = (r) => `${r.firstName || ""} ${r.lastName || ""}`.trim() || "—"

  return (
    <div className="space-y-6 p-4 lg:p-8 pt-20 lg:pt-8">
      <div className="flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Member Registrations</h1>
          <p className="text-sm text-muted-foreground">Approve or reject people who signed up to join.</p>
        </div>
      </div>

      {notice && (
        <Alert variant={notice.type === "error" ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No {tab} registrations.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <Card key={r._id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{fullName(r)}</CardTitle>
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {r.email}</span>
                  {r.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {r.phone}</span>}
                  {(r.collegeName || r.courseName) && (
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {[r.courseName, r.collegeName].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {r.memberId && (
                    <span className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> {r.memberId}</span>
                  )}
                </div>

                {r.message && (
                  <p className="rounded-md bg-secondary p-3 text-sm">{r.message}</p>
                )}
                {r.status === "rejected" && r.rejectionReason && (
                  <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">{r.rejectionReason}</p>
                )}

                {r.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => approve(r)} disabled={busyId === r._id}>
                      <Check className="mr-1.5 h-4 w-4" />
                      {busyId === r._id ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRejectTarget(r); setRejectReason("") }}
                      disabled={busyId === r._id}
                    >
                      <X className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              Optionally add a reason. It will be included in the email sent to {rejectTarget?.email}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doReject} disabled={busyId === rejectTarget?._id}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual credentials dialog (shown only when email could not be sent) */}
      <Dialog open={!!manualCreds} onOpenChange={(o) => !o && setManualCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share these login details</DialogTitle>
            <DialogDescription>
              The approval email could not be sent. Copy these and give them to the member directly.
            </DialogDescription>
          </DialogHeader>
          {manualCreds && (
            <div className="space-y-2 rounded-md bg-secondary p-4 text-sm font-mono">
              <div>Email: <b>{manualCreds.email}</b></div>
              <div>Password: <b>{manualCreds.password}</b></div>
              <div>Member ID: <b>{manualCreds.memberId}</b></div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setManualCreds(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
