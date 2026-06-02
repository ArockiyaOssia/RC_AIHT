import mongoose from "mongoose"

const galleryImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    fileId: String,
    caption: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "General",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
)

const GalleryImage = mongoose.model("GalleryImage", galleryImageSchema)

export default GalleryImage
