import ImageKit from "@imagekit/nodejs"
import sharp from "sharp"
import { Readable } from "stream"
import config from "../config/config.js"
import { logger } from "./logger.js"

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: config.imagekitPublicKey,
  privateKey: config.imagekitPrivateKey,
  urlEndpoint: config.imagekitUrlEndpoint,
})

// ImageKit initialized - verification moved to on-demand to avoid startup hangs

// Enable SIMD if available for sharp performance
try {
  sharp.simd(true)
} catch (e) {
  // Ignore if not supported
}

/**
 * Optimize and upload image to ImageKit
 * @param {Buffer} fileBuffer - The original file buffer
 * @param {string} fileName - The desired file name
 * @param {string} folder - The folder in ImageKit (e.g., 'photos', 'bills')
 * @returns {Promise<object>} - ImageKit upload response
 */
export const uploadToImageKit = async (fileBuffer, fileName, folder = "general") => {
  const startTime = Date.now()
  try {
    if (!fileBuffer) {
      throw new Error("File buffer is missing")
    }

    let finalBuffer = fileBuffer
    let finalFileName = fileName

    // 1. Optimize image using sharp
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)
    const isSmall = fileBuffer.length < config.maxStorageSize

    if (isImage && (!isSmall || !fileName.endsWith(".webp"))) {
      const sharpStart = Date.now()
      finalBuffer = await sharp(fileBuffer, { failOnError: false })
        .rotate()
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70, effort: 1 })
        .toBuffer()

      finalFileName = fileName.endsWith(".webp") ? fileName : `${fileName.split(".")[0]}.webp`
      logger.info(`Image processing took ${Date.now() - sharpStart}ms`)
    }

    // 2. Convert to Base64 for maximum compatibility with ImageKit SDK v7
    const fileBase64 = finalBuffer.toString("base64")

    // 3. Upload to ImageKit with Promise-based timeout
    const uploadStart = Date.now()

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("ImageKit upload timed out after 30s")), 30000)
    )

    const uploadPromise = imagekit.files.upload({
      file: fileBase64,
      fileName: finalFileName,
      folder: `rotaract/${folder}`,
      useUniqueFileName: true,
    })

    // Race the upload against the timeout
    const uploadResponse = await Promise.race([uploadPromise, timeoutPromise])

    logger.info(`ImageKit upload took ${Date.now() - uploadStart}ms. Total time: ${Date.now() - startTime}ms`)
    return uploadResponse
  } catch (error) {
    logger.error(`ImageKit upload error after ${Date.now() - startTime}ms: ${error.message}`)

    // If it was a timeout or 400, it might be a transient network issue or size issue
    if (error.message.includes("timed out") || error.message.includes("400")) {
      logger.warn("Possible network bottleneck or ImageKit API rejection. Ensure internet connection is stable.")
    }
    throw error
  }
}

/**
 * Delete image from ImageKit
 * @param {string} fileId - The file ID in ImageKit
 */
export const deleteFromImageKit = async (fileId) => {
  try {
    if (!fileId) return
    // In v7 SDK, it's just .delete() on the files resource
    await imagekit.files.delete(fileId)
  } catch (error) {
    logger.error(`ImageKit delete error: ${error.message}`)
    // Don't throw if delete fails, just log it
  }
}

/**
 * Extract file ID from metadata or URL (if stored)
 * Note: It's better to store fileId in the database alongside the URL
 */
export const getFileIdFromUrl = (url) => {
  // This is tricky without the direct ID. 
  // In a robust system, we should save fileId in the DB.
  return null
}

export default {
  uploadToImageKit,
  deleteFromImageKit,
}
