import GalleryImage from "../models/GalleryImage.model.js"
import { logger } from "../utils/logger.js"
import { deleteFile } from "../utils/helpers.js"
import { uploadToImageKit, deleteFromImageKit } from "../utils/imagekit.js"

// @desc    Upload an image to the general gallery
// @route   POST /api/gallery/upload
// @access  Private/Admin
export const uploadGalleryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an image" })
    }

    const { caption, category } = req.body

    const uploadResult = await uploadToImageKit(
      req.file.buffer, 
      `gallery-${Date.now()}`, 
      "gallery"
    )

    const image = await GalleryImage.create({
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      caption: caption || "",
      category: category || "General",
      uploadedBy: req.user._id,
    })

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: image,
    })
  } catch (error) {
    logger.error(`Upload gallery image error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
    })
  }
}

// @desc    Get gallery images
// @route   GET /api/gallery/public
// @access  Public
export const getPublicGalleryImages = async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ createdAt: -1 })
    res.status(200).json({
      success: true,
      data: images,
    })
  } catch (error) {
    logger.error(`Get gallery images error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery images",
    })
  }
}

// @desc    Delete gallery image
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
export const deleteGalleryImage = async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id)

    if (!image) {
      return res.status(404).json({ success: false, message: "Image not found" })
    }

    // Delete file from ImageKit/filesystem
    if (image.fileId) {
      await deleteFromImageKit(image.fileId)
    } else if (image.url) {
      deleteFile(image.url)
    }

    await image.deleteOne()

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    })
  } catch (error) {
    logger.error(`Delete gallery image error: ${error.message}`)
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
    })
  }
}
