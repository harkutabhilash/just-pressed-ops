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
  console.log('🔍 Upload attempt:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    returnId,
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET
  })

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (jpg, png, etc.)')
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image must be less than 2MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  // Check environment variables
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('❌ Cloudinary Cloud Name not configured. Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local')
  }
  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('❌ Cloudinary Upload Preset not configured. Check NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  
  // Organize by return ID: returns/RET-260203-1234/image_timestamp
  formData.append('folder', `returns/${returnId}`)
  
  const timestamp = Date.now()
  formData.append('public_id', `image_${timestamp}`)

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
  console.log('📤 Uploading to:', uploadUrl)

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    console.log('📥 Cloudinary response:', { status: response.status, data })

    if (!response.ok) {
      console.error('❌ Cloudinary upload error:', data)
      
      // Specific error messages
      if (data.error?.message) {
        throw new Error(data.error.message)
      }
      if (response.status === 401) {
        throw new Error('Upload preset not found or not configured for unsigned uploads. Check Cloudinary dashboard.')
      }
      if (response.status === 400) {
        throw new Error('Invalid upload request. Check your Cloudinary configuration.')
      }
      
      throw new Error(`Upload failed with status ${response.status}`)
    }

    console.log('✅ Upload successful:', data.secure_url)
    return {
      url: data.secure_url,
      public_id: data.public_id,
    }
  } catch (error) {
    console.error('💥 Upload exception:', error)
    throw new Error(`Failed to upload ${file.name}: ${error.message}`)
  }
}

/**
 * Upload video to Cloudinary
 */
export async function uploadReturnVideo(file, returnId) {
  if (!file.type.startsWith('video/')) {
    throw new Error('File must be a video (mp4, mov, etc.)')
  }

  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`Video must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', `returns/${returnId}`)
  formData.append('public_id', `video_${Date.now()}`)
  formData.append('resource_type', 'video')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Video upload error:', data)
    throw new Error(data.error?.message || `Upload failed: ${response.status}`)
  }

  return { url: data.secure_url, public_id: data.public_id }
}

/**
 * Validate file before upload
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
