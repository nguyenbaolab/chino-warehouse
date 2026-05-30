import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat, manipulateAsync } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '../lib/supabase'

const BUCKET = 'product-images'
const MAX_IMAGE_SIDE = 1200
const JPEG_COMPRESS = 0.8

const libraryPickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
}

const cameraPickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
}

function storagePath(productId: string): string {
  return `${productId}.jpg`
}

/**
 * Xin quyền và mở camera hoặc thư viện ảnh; trả về URI local hoặc null nếu từ chối/hủy.
 */
export async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) return null

  if (source === 'library') {
    const result = await ImagePicker.launchImageLibraryAsync(libraryPickerOptions)
    if (result.canceled || !result.assets[0]?.uri) return null
    return result.assets[0].uri
  }

  const result = await ImagePicker.launchCameraAsync(cameraPickerOptions)
  if (result.canceled || !result.assets[0]?.uri) return null

  const { width, height, uri } = result.assets[0]
  const size = Math.min(width, height)
  const originX = (width - size) / 2
  const originY = (height - size) / 2

  const cropped = await manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: size, height: size } }],
    { compress: 1, format: SaveFormat.JPEG },
  )
  return cropped.uri
}

async function compressImage(uri: string): Promise<string> {
  const loaded = await ImageManipulator.manipulate(uri).renderAsync()
  const { width, height } = loaded

  let pipeline = ImageManipulator.manipulate(uri)
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
    pipeline =
      width >= height
        ? pipeline.resize({ width: MAX_IMAGE_SIDE })
        : pipeline.resize({ height: MAX_IMAGE_SIDE })
  }

  const image = await pipeline.renderAsync()
  const saved = await image.saveAsync({
    compress: JPEG_COMPRESS,
    format: SaveFormat.JPEG,
  })
  return saved.uri
}

/**
 * Nén ảnh (JPEG 80%, max 1200px cạnh dài), upload lên Storage và trả về public URL.
 */
export async function uploadProductImage(productId: string, uri: string): Promise<string> {
  console.log('[F08] compress start:', uri)
  const compressed = { uri: await compressImage(uri) }
  console.log('[F08] compress done:', compressed.uri)
  const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  console.log('[F08] blob size:', bytes.length)
  const path = storagePath(productId)
  console.log('[F08] upload start to path:', productId + '.jpg')

  const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes.buffer, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  console.log('[F08] upload result:', uploadData, uploadError)

  if (uploadError) throw new Error('Upload that bai')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = data.publicUrl
  console.log('[F08] publicUrl:', publicUrl)
  return `${publicUrl}?v=${Date.now()}`
}

/**
 * Xóa ảnh sản phẩm trên Storage; bỏ qua nếu file không tồn tại.
 */
export async function deleteProductImage(productId: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath(productId)])

  if (!error) return

  const message = (error.message ?? '').toLowerCase()
  if (message.includes('not found') || message.includes('object not found')) return

  throw new Error('Xoa anh that bai')
}
