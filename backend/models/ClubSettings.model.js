// ============================================
// CLUB SETTINGS MODEL
// ============================================

import mongoose from "mongoose"

const clubSettingsSchema = new mongoose.Schema(
  {
    // Club Info
    clubName: {
      type: String,
      required: true,
      default: "Rotaract Club of AIHT",
    },
    parentClubName: {
      type: String,
      default: "Rotary Club of Chennai chennai silk city",
    },
    collegeName: {
      type: String,
      default: "Anand Institute of Higher Technology",
    },
    rid: {
      type: String,
      default: "3233",
    },

    // Current Year
    currentRotaractYear: {
      type: String,
      required: true,
    },
    yearStartDate: Date,
    yearEndDate: Date,

    // Logos
    clubLogo: String,
    clubLogoId: String,
    rotaractLogo: String,
    rotaractLogoId: String,
    parentClubLogo: String,
    parentClubLogoId: String,
    collegeLogo: String,
    collegeLogoId: String,

    // Theme
    themeOfYear: String,
    primaryColor: {
      type: String,
      default: "#0066cc",
    },
    secondaryColor: {
      type: String,
      default: "#ff9800",
    },

    // Content
    aboutRotaract: String,
    missionStatement: String,
    visionStatement: String,
    clubHistory: String,
    aboutClubDescription: String,
    homeHeroTitle: String,
    homeHeroSubtitle: String,
    homeHeroDescription: String,
    contactDescription: String,

    // Contact
    contactEmail: String,
    contactPhone: String,
    address: String,
    meetingSchedule: String,
    googleMapUrl: {
      type: String,
      default: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3890.3863225309346!2d80.22595567538026!3d12.818294318220223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a525a64a9d9fdbd%3A0xfe20d2c9e0df4861!2sAnand%20Institute%20of%20Higher%20Technology!5e0!3m2!1sen!2sin!4v1775803619602!5m2!1sen!2sin",
    },

    // Dynamic UI Content Strings
    statsActiveMembers: { type: String, default: "50+" },
    statsEventsThisYear: { type: String, default: "25+" },
    statsServiceHours: { type: String, default: "1000+" },
    statsYearsOfService: { type: String, default: "10+" },

    legacyProjectsCompleted: { type: String, default: "200+" },
    legacyAlumniMembers: { type: String, default: "500+" },
    legacyLivesImpacted: { type: String, default: "50K+" },

    establishedYear: { type: String, default: "2015" },
    joinCommunityText: { type: String, default: "Be part of a global network of young leaders making a difference. Join Rotaract Club of AIH and start your journey of service and leadership." },

    achievements: [
      {
        year: String,
        title: String,
      }
    ],

    areasOfFocus: [
      {
        title: String,
        description: String,
      }
    ],

    // Social Media
    socialMedia: {
      instagram: String,
      facebook: String,
      twitter: String,
      linkedin: String,
      youtube: String,
      website: String,
    },

    // Feature Flags
    features: {
      enableTwoFactor: { type: Boolean, default: false },
      enableEmailNotifications: { type: Boolean, default: true },
      enablePublicGallery: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  },
)

// Ensure only one settings document exists
clubSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({
      currentRotaractYear: "2025-2026",
    })
  }
  return settings
}

const ClubSettings = mongoose.model("ClubSettings", clubSettingsSchema)

export default ClubSettings
