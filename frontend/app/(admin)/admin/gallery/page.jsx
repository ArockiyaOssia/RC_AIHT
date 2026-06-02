"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash, Upload, Image as ImageIcon } from "lucide-react"
import api from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AdminGalleryPage() {
  const [images, setImages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [newImage, setNewImage] = useState({ file: null, caption: "", category: "General" })
  const [fileSizeError, setFileSizeError] = useState(false)
  const [error, setError] = useState("")

  const groupedImages = useMemo(() => {
    return images.reduce((acc, img) => {
      const album = img.category || "General";
      if (!acc[album]) acc[album] = [];
      acc[album].push(img);
      return acc;
    }, {});
  }, [images]);

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
      const response = await api.request("/gallery/public")
      setImages(response.data || [])
    } catch (err) {
      console.error(err)
      setError("Failed to fetch images")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.size > 500 * 1024) {
      setFileSizeError(true)
    } else {
      setFileSizeError(false)
    }
    setNewImage((prev) => ({ ...prev, file }))
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!newImage.file) return
    if (fileSizeError) {
      setError("Please reduce the file size below 500KB or choose another image.")
      return
    }

    setIsUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("gallery", newImage.file)
      formData.append("caption", newImage.caption)
      formData.append("category", newImage.category)

      await api.request("/gallery/upload", {
        method: "POST",
        body: formData,
      })
      
      setNewImage({ file: null, caption: "", category: "General" })
      setFileSizeError(false)
      document.getElementById("image-upload").value = ""
      fetchImages()
    } catch (err) {
      console.error(err)
      setError("Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const [isDeleting, setIsDeleting] = useState(null) // ID of image being deleted

  const handleDelete = async (id) => {
    setIsDeleting(id)
  }

  const confirmDelete = async () => {
    if (!isDeleting) return
    try {
      await api.request(`/gallery/${isDeleting}`, { method: "DELETE" })
      fetchImages()
    } catch (err) {
      console.error(err)
      setError("Failed to delete image")
    } finally {
      setIsDeleting(null)
    }
  }

  const getImageUrl = (path) => {
    if (!path) return ""
    if (path.startsWith("http")) return path
    let apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    if (apiBaseUrl.endsWith("/api")) {
      apiBaseUrl = apiBaseUrl.replace(/\/api$/, "")
    }
    return `${apiBaseUrl}${path}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Gallery</h1>
        <p className="text-muted-foreground">Upload and manage general club images</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fileSizeError && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="text-amber-700 dark:text-amber-400 text-sm">
              <span className="font-bold underline">Warning:</span> This file is larger than 500KB ({Math.round(newImage.file.size/1024)}KB). Performance may be affected.
            </div>
            <Button size="sm" variant="ghost" onClick={() => {
              setFileSizeError(false)
              setNewImage(p => ({...p, file: null}))
              document.getElementById("image-upload").value = ""
            }}>Clear</Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleUpload} className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image-upload">Select Image (Max 500KB recommended)</Label>
              <Input 
                id="image-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className={fileSizeError ? "border-amber-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="album">Album Name</Label>
              <Input
                id="album"
                value={newImage.category}
                onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                placeholder="e.g. Installation 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Input
                id="caption"
                value={newImage.caption}
                onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <Button type="submit" disabled={isUploading || !newImage.file} className="md:col-span-4">
              {isUploading ? "Uploading..." : <><Upload className="mr-2 h-4 w-4" /> Upload to Album</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm border-destructive shadow-2xl">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Confirm Deletion</h3>
                <p className="text-sm text-muted-foreground">Are you sure you want to remove this image? This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsDeleting(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-8">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          Object.entries(groupedImages).map(([albumName, albumImages]) => (
            <div key={albumName} className="space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2">{albumName}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {albumImages.map((img) => (
                  <Card key={img._id} className="overflow-hidden group">
                    <div className="aspect-square relative flex items-center justify-center bg-muted">
                      <img
                        src={getImageUrl(img.url)}
                        alt={img.caption || "Gallery image"}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                        <p className="text-white text-sm line-clamp-2">{img.caption}</p>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(img._id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
