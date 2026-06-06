"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Shield, AlertCircle } from "lucide-react"

export default function AdminLoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { adminLogin } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await adminLogin(formData)
      if (response.requires2FA && !show2FA) {
        setShow2FA(true)
        setIsLoading(false)
        return
      }
      router.push("/admin")
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="w-full max-w-md">
      <Card className="glass-strong glow border-border/60">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Badge variant="outline" className="border-accent text-accent">
              <Shield className="mr-1 h-3 w-3" /> Admin Access
            </Badge>
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>For Treasurer, President, and Secretary only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@rcaih.org"
                required
                disabled={show2FA}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={show2FA}
                  className="bg-secondary border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {show2FA && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">2FA Code</Label>
                <Input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  type="text"
                  value={formData.twoFactorCode}
                  onChange={handleChange}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="bg-secondary border-border text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">Enter the code from your authenticator app</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                "Verifying..."
              ) : show2FA ? (
                "Verify & Sign In"
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" /> Admin Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-muted-foreground">
            Not an admin?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Member Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
