import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { supabase } from '../lib/supabase'

const BUCKET = 'product-images'
const MAX_IMAGE_SIDE = 1200
const JPEG_COMPRESS = 0.8

const pickerOptions: ImagePicker.ImagePickerOptions = {
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

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions)

  if (result.canceled || !result.assets[0]?.uri) return null
  return result.assets[0].uri
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
  const compressedUri = await compressImage(uri)
  const blob = await fetch(compressedUri).then((response) => response.blob())
  const path = storagePath(productId)

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })

  if (error) throw new Error('Upload that bai')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
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
