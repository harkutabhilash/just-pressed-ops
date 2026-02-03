// lib/cloudinary.js
// Cloudinary upload utility for Returns module
// Images: max 2MB, Videos: max 5MB

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

// File size limits
const MAX_IMAGE_SIZE = 2 * 1024 * 1024  // 2MB in bytes
const MAX_VIDEO_SIZE = 5 * 1024 * 1024  // 5MB in bytes

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file from input
 * @param {string} returnId - Return ID for naming (e.g., "RET-260203-1234")
 * @returns {Promise<{url: string, public_id: string}>}
 */
export async function uploadReturnImage(file, returnId) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (jpg, png, etc.)')
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image must be less than 2MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  
  // Organize by return ID: returns/RET-260203-1234/image_timestamp
  formData.append('folder', `returns/${returnId}`)
  
  const timestamp = Date.now()
  formData.append('public_id', `image_${timestamp}`)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error('Failed to upload image to Cloudinary')
  }

  const data = await response.json()
  return {
    url: data.secure_url,
    public_id: data.public_id,
  }
}

/**
 * Upload video to Cloudinary
 * @param {File} file - Video file from input
 * @param {string} returnId - Return ID for naming
 * @returns {Promise<{url: string, public_id: string}>}
 */
export async function uploadReturnVideo(file, returnId) {
  // Validate file type
  if (!file.type.startsWith('video/')) {
    throw new Error('File must be a video (mp4, mov, etc.)')
  }

  // Validate file size
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`Video must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  
  // Organize by return ID: returns/RET-260203-1234/video_timestamp
  formData.append('folder', `returns/${returnId}`)
  
  const timestamp = Date.now()
  formData.append('public_id', `video_${timestamp}`)
  formData.append('resource_type', 'video')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error('Failed to upload video to Cloudinary')
  }

  const data = await response.json()
  return {
    url: data.secure_url,
    public_id: data.public_id,
  }
}

/**
 * Upload multiple images at once
 * @param {FileList|File[]} files - Array of image files
 * @param {string} returnId - Return ID for naming
 * @returns {Promise<Array<{url: string, public_id: string}>>}
 */
export async function uploadReturnImages(files, returnId) {
  const uploads = []
  for (const file of files) {
    try {
      const result = await uploadReturnImage(file, returnId)
      uploads.push(result)
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error.message)
      throw error // Stop on first failure
    }
  }
  return uploads
}

/**
 * Delete image/video from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @param {string} resourceType - 'image' or 'video'
 */
export async function deleteCloudinaryAsset(publicId, resourceType = 'image') {
  // Note: Deletion requires backend API with Cloudinary API secret
  // For now, we'll just remove from our database
  // Implement server-side deletion later if needed
  console.warn('Cloudinary deletion requires server-side implementation')
}

/**
 * Validate file before upload
 * @param {File} file
 * @param {string} type - 'image' or 'video'
 * @returns {boolean}
 */
export function validateFile(file, type) {
  if (type === 'image') {
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' }
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image must be less than 2MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)` }
    }
  } else if (type === 'video') {
    if (!file.type.startsWith('video/')) {
      return { valid: false, error: 'File must be a video' }
    }
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: `Video must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)` }
    }
  }
  return { valid: true }
}
