"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin, Send, Clock, Twitter, Youtube, Globe } from "lucide-react"
import { DynamicContent } from "@/components/dynamic-content"
import { PageHero } from "@/components/page-hero"
import api from "@/lib/api"
import { useClubSettings } from "@/contexts/club-settings-context"

export default function ContactPage() {
  const { settings } = useClubSettings()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: "", message: "" })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setFeedback({ type: "", message: "" })
      await api.sendContactMessage(formData)
      setFeedback({ type: "success", message: "Thank you! Your message has been sent successfully." })
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Failed to send message. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <PageHero
        eyebrow="Contact"
        title={<>Get in <span className="text-gradient">Touch</span></>}
      >
        <DynamicContent
          as="p"
          field="contactDescription"
          defaultText="Have questions about Rotaract or want to join our club? We'd love to hear from you."
        />
      </PageHero>

      {/* Contact Section */}
      <section className="py-16">
        <div className="container px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Contact Form */}
            <Card className="glass border-border/60">
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {feedback.message && (
                    <div
                      className={`rounded-md border px-3 py-2 text-sm ${
                        feedback.type === "success"
                          ? "border-green-600/40 text-green-400"
                          : "border-red-600/40 text-red-400"
                      }`}
                    >
                      {feedback.message}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What's this about?"
                        required
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Your message..."
                      rows={5}
                      required
                      className="bg-secondary border-border resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="glass border-border/60">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Email</p>
                        <a
                          href={`mailto:${settings?.contactEmail || "rotaract@aih.edu"}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {settings?.contactEmail || "rotaract@aih.edu"}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Phone</p>
                        <a
                          href={`tel:${settings?.contactPhone || "+91 98765 43210"}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {settings?.contactPhone || "+91 98765 43210"}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Address</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {settings?.address || "Apollo Institute of Hospital\n21, Greams Lane, Off Greams Road\nChennai - 600006, Tamil Nadu"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Meeting Schedule</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {settings?.meetingSchedule || "Every Saturday, 5:00 PM - 7:00 PM"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-border/60">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Follow Us</h3>
                  <div className="flex gap-4">
                    {settings?.socialMedia?.instagram && (
                      <a
                        href={settings.socialMedia.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {settings?.socialMedia?.facebook && (
                      <a
                        href={settings.socialMedia.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {settings?.socialMedia?.linkedin && (
                      <a
                        href={settings.socialMedia.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {settings?.socialMedia?.twitter && (
                      <a
                        href={settings.socialMedia.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {settings?.socialMedia?.youtube && (
                      <a
                        href={settings.socialMedia.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Youtube className="h-5 w-5" />
                      </a>
                    )}
                    {settings?.socialMedia?.website && (
                      <a
                        href={settings.socialMedia.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                    {(!settings?.socialMedia?.instagram && !settings?.socialMedia?.facebook && !settings?.socialMedia?.linkedin && !settings?.socialMedia?.twitter && !settings?.socialMedia?.youtube && !settings?.socialMedia?.website) && (
                      <p className="text-sm text-muted-foreground">No social media links provided.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-border/60">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Parent Organization</h3>
                  <p className="text-sm text-muted-foreground mb-2"><DynamicContent field="parentClubName" defaultText="Rotary Club of Chennai Central" /></p>
                  <p className="text-xs text-muted-foreground">Rotary International <DynamicContent field="rid" defaultText="District 3233" /></p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 border-t border-border/60">
        <div className="container px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">Find <span className="text-gradient">Us</span></h2>
          <div className="aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border/60 glass glow">
            <iframe
              src={settings?.googleMapUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3890.3863225309346!2d80.22595567538026!3d12.818294318220223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525a64a9d9fdbd%3A0xfe20d2c9e0df4861!2sAnand%20Institute%20of%20Higher%20Technology!5e0!3m2!1sen!2sin!4v1775803619602!5m2!1sen!2sin"}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
