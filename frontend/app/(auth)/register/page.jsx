"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, AlertCircle, CheckCircle2 } from "lucide-react"
import api from "@/lib/api"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    collegeName: "",
    courseName: "",
    message: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await api.register(formData)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md">
        <Card className="glass-strong glow border-border/60">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Registration submitted</CardTitle>
            <CardDescription>
              Thanks for registering! An admin will review your request. Once approved,
              you'll receive an email at <b>{formData.email}</b> with your login details.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Become a Member</CardTitle>
          <CardDescription>Register below. You'll get login details by email after admin approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="bg-secondary border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required className="bg-secondary border-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="10-digit number" className="bg-secondary border-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="collegeName">College</Label>
                <Input id="collegeName" name="collegeName" value={formData.collegeName} onChange={handleChange} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Course</Label>
                <Input id="courseName" name="courseName" value={formData.courseName} onChange={handleChange} className="bg-secondary border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Why do you want to join? (optional)</Label>
              <Textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={3} className="bg-secondary border-border" />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : (<><UserPlus className="mr-2 h-4 w-4" /> Submit Registration</>)}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
