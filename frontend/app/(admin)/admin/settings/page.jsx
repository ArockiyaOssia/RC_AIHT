"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Upload, Building, Palette, Calendar, CheckCircle, AlertCircle } from "lucide-react"
import api from "@/lib/api"
import { useClubSettings } from "@/contexts/club-settings-context"

export default function ClubSettingsPage() {
  const { refreshSettings, getLogoSrc: contextGetLogoSrc } = useClubSettings()
  const [settings, setSettings] = useState({
    clubName: "Rotaract Club of AIH",
    parentClubName: "Rotary Club of Chennai Skil City",
    rid: "3233",
    currentRotaractYear: "2025-2026",
    collegeName: "Anand Institute of Higher Technology",
    contactEmail: "rotaractaiht@gmail.com",
    contactPhone: "+91 98765 43210",
    address: "Chennai, Tamil Nadu",
    meetingSchedule: "Every Saturday, 5:00 PM - 7:00 PM",
    themeOfYear: "அறம் வழி அறம் வளர்த்து",
    homeHeroTitle: "Rotaract Club of",
    homeHeroSubtitle: "Anand Institute of Higher Technology",
    homeHeroDescription: "Building future leaders through community service, professional development, and creating lasting change in our communities. RID 3233.",
    aboutClubDescription: "A decade of service, leadership, and community impact. We are a community of young professionals and students united by our commitment to making a positive difference.",
    aboutRotaract: "Rotaract is a global network of young leaders who are committed to making a difference in their communities. With over 10,000 clubs worldwide, we are united by a shared vision of service above self.",
    contactDescription: "Have questions about Rotaract or want to join our club? We'd love to hear from you.",
    clubHistory: "Rotaract Club of Apollo Institute of Hospital was chartered in 2014 with a vision to create a platform for young healthcare professionals and students to engage in meaningful community service while developing leadership skills.",
    statsActiveMembers: "50+",
    statsEventsThisYear: "25+",
    statsServiceHours: "1000+",
    statsYearsOfService: "10+",
    legacyProjectsCompleted: "200+",
    legacyAlumniMembers: "500+",
    legacyLivesImpacted: "50K+",
    establishedYear: "2015",
    joinCommunityText: "Be part of a global network of young leaders making a difference. Join Rotaract Club of AIH and start your journey of service and leadership.",
    socialMedia: { instagram: "", facebook: "", linkedin: "", twitter: "", youtube: "", website: "" },
    achievements: [],
    areasOfFocus: [],
    googleMapUrl: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.getSettings()
        if (response.data) {
          const data = response.data
          setSettings((prev) => ({
            ...prev,
            clubName: data.clubName ?? prev.clubName ?? "",
            parentClubName: data.parentClubName ?? prev.parentClubName ?? "",
            rid: data.rid ?? prev.rid ?? "3233",
            currentRotaractYear: data.currentRotaractYear ?? prev.currentRotaractYear ?? "2025-2026",
            collegeName: data.collegeName ?? prev.collegeName ?? "",
            contactEmail: data.contactEmail ?? prev.contactEmail ?? "",
            contactPhone: data.contactPhone ?? prev.contactPhone ?? "",
            district: data.district ?? prev.district ?? "",
            address: data.address ?? prev.address ?? "",
            meetingSchedule: data.meetingSchedule ?? prev.meetingSchedule ?? "Every Saturday, 5:00 PM - 7:00 PM",
            themeOfYear: data.themeOfYear ?? prev.themeOfYear ?? "அறம் வழி அறம் வளர்த்து",
            homeHeroTitle: data.homeHeroTitle ?? prev.homeHeroTitle,
            homeHeroSubtitle: data.homeHeroSubtitle ?? prev.homeHeroSubtitle,
            homeHeroDescription: data.homeHeroDescription ?? prev.homeHeroDescription,
            aboutClubDescription: data.aboutClubDescription ?? prev.aboutClubDescription,
            aboutRotaract: data.aboutRotaract ?? prev.aboutRotaract,
            contactDescription: data.contactDescription ?? prev.contactDescription,
            clubHistory: data.clubHistory ?? prev.clubHistory,
            clubLogo: data.clubLogo ?? prev.clubLogo,
            rotaractLogo: data.rotaractLogo ?? prev.rotaractLogo,
            statsActiveMembers: data.statsActiveMembers ?? prev.statsActiveMembers,
            statsEventsThisYear: data.statsEventsThisYear ?? prev.statsEventsThisYear,
            statsServiceHours: data.statsServiceHours ?? prev.statsServiceHours,
            statsYearsOfService: data.statsYearsOfService ?? prev.statsYearsOfService,
            legacyProjectsCompleted: data.legacyProjectsCompleted ?? prev.legacyProjectsCompleted,
            legacyAlumniMembers: data.legacyAlumniMembers ?? prev.legacyAlumniMembers,
            legacyLivesImpacted: data.legacyLivesImpacted ?? prev.legacyLivesImpacted,
            establishedYear: data.establishedYear ?? prev.establishedYear,
            joinCommunityText: data.joinCommunityText ?? prev.joinCommunityText,
            socialMedia: data.socialMedia ?? prev.socialMedia,
            achievements: data.achievements ?? [],
            areasOfFocus: data.areasOfFocus ?? [],
            googleMapUrl: data.googleMapUrl ?? prev.googleMapUrl ?? "",
          }))
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
      }
    }
    fetchSettings()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveSettings = async () => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      await api.updateSettings(settings)
      // Refresh global settings so all components update
      await refreshSettings()
      setSuccess("Settings saved successfully!")
    } catch (err) {
      setError(err.message || "Failed to save settings")
    } finally {
      setIsLoading(false)
    }
  }

  const getLogoSrc = (path) => {
    if (!path) return ""
    // Use the context's getLogoSrc function
    return contextGetLogoSrc(path) || ""
  }

  const [logoSizeError, setLogoSizeError] = useState(false)
  const [currentUploadingField, setCurrentUploadingField] = useState("")

  const handleLogoUpload = async (event, fieldName) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 500 * 1024) {
      setLogoSizeError(true)
      setCurrentUploadingField(fieldName)
      return
    }

    setLogoSizeError(false)
    setError("")
    setSuccess("")
    setIsUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append(fieldName, file)

      const response = await api.updateLogos(formData)

      if (response.data) {
        setSettings((prev) => ({
          ...prev,
          clubLogo: response.data.clubLogo ?? prev.clubLogo,
          rotaractLogo: response.data.rotaractLogo ?? prev.rotaractLogo,
          parentClubLogo: response.data.parentClubLogo ?? prev.parentClubLogo,
          collegeLogo: response.data.collegeLogo ?? prev.collegeLogo,
        }))
      }

      await refreshSettings()
      setSuccess("Logo updated successfully!")
    } catch (err) {
      console.error("Error uploading logo:", err)
      setError(err.message || "Failed to upload logo")
    } finally {
      setIsUploadingLogo(false)
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Club Settings</h1>
        <p className="text-muted-foreground">Manage club configuration and branding</p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-success bg-success/10 mb-4">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}
      {logoSizeError && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-4">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="text-amber-700 dark:text-amber-400 text-sm">
              <span className="font-bold underline">Size Warning:</span> The logo you selected for <strong>{currentUploadingField}</strong> is larger than 500KB. Please compress it first to maintain site speed.
            </div>
            <Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100" onClick={() => setLogoSizeError(false)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-secondary flex flex-wrap h-auto w-full justify-start gap-2 p-1">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Building className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Palette className="mr-2 h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger
            value="content"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Building className="mr-2 h-4 w-4" /> Site Content
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Statistics
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <AlertCircle className="mr-2 h-4 w-4" /> Social Links
          </TabsTrigger>
          <TabsTrigger
            value="year"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Calendar className="mr-2 h-4 w-4" /> Rotaract Year
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Club Information</CardTitle>
              <CardDescription>Basic club details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name</Label>
                  <Input
                    id="clubName"
                    name="clubName"
                    value={settings.clubName ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentClubName">Parent Rotary Club</Label>
                  <Input
                    id="parentClubName"
                    name="parentClubName"
                    value={settings.parentClubName ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rid">District</Label>
                  <Input
                    id="rid"
                    name="rid"
                    value={settings.rid ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="establishedYear">Established Year</Label>
                  <Input
                    id="establishedYear"
                    name="establishedYear"
                    value={settings.establishedYear ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collegeName">College/Institution Name</Label>
                  <Input
                    id="collegeName"
                    name="collegeName"
                    value={settings.collegeName ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={settings.contactEmail ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={settings.contactPhone ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={settings.address ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingSchedule">Meeting Schedule</Label>
                  <Textarea
                    id="meetingSchedule"
                    name="meetingSchedule"
                    value={settings.meetingSchedule ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="googleMapUrl">Google Maps Embed URL (iframe src)</Label>
                <Input
                  id="googleMapUrl"
                  name="googleMapUrl"
                  value={settings.googleMapUrl ?? ""}
                  onChange={handleChange}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  className="bg-secondary border-border"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Copy the <strong>src</strong> attribute value from the Google Maps iframe embed code.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Club Branding</CardTitle>
              <CardDescription>Logos and visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <Label>Club Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary overflow-hidden">
                      {settings.clubLogo ? (
                        <img
                          src={getLogoSrc(settings.clubLogo)}
                          alt="Club Logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                          <span className="text-2xl font-bold text-primary-foreground">R</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        id="clubLogoInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload(e, "clubLogo")}
                      />
                      <Button
                        variant="outline"
                        asChild
                        disabled={isUploadingLogo}
                      >
                        <label htmlFor="clubLogoInput" className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          {isUploadingLogo ? "Uploading..." : "Upload"}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Rotaract Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary overflow-hidden">
                      <img
                        src={
                          settings.rotaractLogo
                            ? getLogoSrc(settings.rotaractLogo)
                            : "/placeholder.svg?height=64&width=64"
                        }
                        alt="Rotaract Logo"
                        className="h-16 w-16 object-contain"
                      />
                    </div>
                    <div>
                      <input
                        id="rotaractLogoInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload(e, "rotaractLogo")}
                      />
                      <Button
                        variant="outline"
                        asChild
                        disabled={isUploadingLogo}
                      >
                        <label htmlFor="rotaractLogoInput" className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          {isUploadingLogo ? "Uploading..." : "Upload"}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="themeOfYear">Theme of the Year</Label>
                <Input
                  id="themeOfYear"
                  name="themeOfYear"
                  value={settings.themeOfYear ?? ""}
                  onChange={handleChange}
                  placeholder="e.g., Service Above Self"
                  className="bg-secondary border-border"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Site Content</CardTitle>
              <CardDescription>Manage the main text shown on the public site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Home Page</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homeHeroTitle">Hero Title</Label>
                    <Input
                      id="homeHeroTitle"
                      name="homeHeroTitle"
                      value={settings.homeHeroTitle ?? ""}
                      onChange={handleChange}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homeHeroSubtitle">Hero Subtitle</Label>
                    <Input
                      id="homeHeroSubtitle"
                      name="homeHeroSubtitle"
                      value={settings.homeHeroSubtitle ?? ""}
                      onChange={handleChange}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homeHeroDescription">Hero Description</Label>
                  <Textarea
                    id="homeHeroDescription"
                    name="homeHeroDescription"
                    value={settings.homeHeroDescription ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-medium">About Club Page</h3>
                <div className="space-y-2">
                  <Label htmlFor="aboutClubDescription">Hero Description</Label>
                  <Textarea
                    id="aboutClubDescription"
                    name="aboutClubDescription"
                    value={settings.aboutClubDescription ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clubHistory">Our Story (History)</Label>
                  <Textarea
                    id="clubHistory"
                    name="clubHistory"
                    value={settings.clubHistory ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    rows={5}
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-medium">About Rotaract Page</h3>
                <div className="space-y-2">
                  <Label htmlFor="aboutRotaract">Hero Description</Label>
                  <Textarea
                    id="aboutRotaract"
                    name="aboutRotaract"
                    value={settings.aboutRotaract ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    rows={4}
                  />
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-medium">Contact Page</h3>
                <div className="space-y-2">
                  <Label htmlFor="contactDescription">Hero Description</Label>
                  <Textarea
                    id="contactDescription"
                    name="contactDescription"
                    value={settings.contactDescription ?? ""}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    rows={2}
                  />
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Areas of Focus</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      areasOfFocus: [...(prev.areasOfFocus || []), { title: "", description: "" }] 
                    }))}
                  >
                    Add Focus Area
                  </Button>
                </div>
                <div className="grid gap-4">
                  {(settings.areasOfFocus || []).map((focus, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-secondary/30 relative">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="absolute top-2 right-2 text-destructive"
                         onClick={() => setSettings(prev => ({
                           ...prev,
                           areasOfFocus: prev.areasOfFocus.filter((_, i) => i !== index)
                         }))}
                       >
                         Remove
                       </Button>
                       <div className="space-y-4 pr-16">
                         <div className="space-y-2">
                           <Label>Title</Label>
                           <Input 
                             value={focus.title} 
                             onChange={(e) => {
                               const newList = [...settings.areasOfFocus];
                               newList[index].title = e.target.value;
                               setSettings({ ...settings, areasOfFocus: newList });
                             }}
                             className="bg-card"
                           />
                         </div>
                         <div className="space-y-2">
                           <Label>Description</Label>
                           <Textarea 
                             value={focus.description} 
                             onChange={(e) => {
                               const newList = [...settings.areasOfFocus];
                               newList[index].description = e.target.value;
                               setSettings({ ...settings, areasOfFocus: newList });
                             }}
                             className="bg-card"
                           />
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Achievements</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      achievements: [...(prev.achievements || []), { year: "", title: "" }] 
                    }))}
                  >
                    Add Achievement
                  </Button>
                </div>
                <div className="grid gap-4">
                  {(settings.achievements || []).map((achievement, index) => (
                    <div key={index} className="grid grid-cols-[100px_1fr_auto] gap-4 items-end p-4 border rounded-lg bg-secondary/30">
                       <div className="space-y-2">
                         <Label>Year</Label>
                         <Input 
                           value={achievement.year} 
                           onChange={(e) => {
                             const newList = [...settings.achievements];
                             newList[index].year = e.target.value;
                             setSettings({ ...settings, achievements: newList });
                           }}
                           placeholder="2024"
                           className="bg-card"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label>Title</Label>
                         <Input 
                           value={achievement.title} 
                           onChange={(e) => {
                             const newList = [...settings.achievements];
                             newList[index].title = e.target.value;
                             setSettings({ ...settings, achievements: newList });
                           }}
                           className="bg-card"
                         />
                       </div>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-destructive mb-1"
                         onClick={() => setSettings(prev => ({
                           ...prev,
                           achievements: prev.achievements.filter((_, i) => i !== index)
                         }))}
                       >
                         Remove
                       </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="year">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Rotaract Year</CardTitle>
              <CardDescription>Current year settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rotaractYear">Current Rotaract Year</Label>
                <Input
                  id="rotaractYear"
                  name="currentRotaractYear"
                  value={settings.currentRotaractYear ?? ""}
                  onChange={handleChange}
                  placeholder="e.g., 2025-2026"
                  className="bg-secondary border-border max-w-xs"
                />
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <h4 className="font-medium mb-2">Year-End Actions</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Use the Archive section to close the current year, export all data, and start a new Rotaract year.
                </p>
                <Button variant="outline" asChild>
                  <a href="/admin/archive">Go to Archive</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Statistics & Legacy</CardTitle>
              <CardDescription>Manage the static highlight numbers across the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Homepage Indicators</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="statsActiveMembers">Active Members</Label>
                    <Input id="statsActiveMembers" name="statsActiveMembers" value={settings.statsActiveMembers ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="statsEventsThisYear">Events This Year</Label>
                    <Input id="statsEventsThisYear" name="statsEventsThisYear" value={settings.statsEventsThisYear ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="statsServiceHours">Service Hours</Label>
                    <Input id="statsServiceHours" name="statsServiceHours" value={settings.statsServiceHours ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="statsYearsOfService">Years of Service (Home)</Label>
                    <Input id="statsYearsOfService" name="statsYearsOfService" value={settings.statsYearsOfService ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-medium">Legacy Stats (About Club)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legacyProjectsCompleted">Projects Completed</Label>
                    <Input id="legacyProjectsCompleted" name="legacyProjectsCompleted" value={settings.legacyProjectsCompleted ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legacyAlumniMembers">Alumni Members</Label>
                    <Input id="legacyAlumniMembers" name="legacyAlumniMembers" value={settings.legacyAlumniMembers ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legacyLivesImpacted">Lives Impacted</Label>
                    <Input id="legacyLivesImpacted" name="legacyLivesImpacted" value={settings.legacyLivesImpacted ?? ""} onChange={handleChange} className="bg-secondary border-border" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>Leave blank if you do not want to display the specific icon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {["instagram", "facebook", "linkedin", "twitter", "youtube", "website"].map((network) => (
                  <div className="space-y-2" key={network}>
                    <Label className="capitalize">{network}</Label>
                    <Input
                      value={settings.socialMedia?.[network] ?? ""}
                      onChange={(e) => setSettings({ ...settings, socialMedia: { ...settings.socialMedia, [network]: e.target.value } })}
                      className="bg-secondary border-border"
                      placeholder={`https://${network}.com/...`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isLoading}>
          {isLoading ? (
            "Saving..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
