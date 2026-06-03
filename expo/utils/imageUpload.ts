import { Platform } from 'react-native';
import { supabase } from './supabase';

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
}

async function getBlobFromUri(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.blob();
  }
  const response = await fetch(uri);
  return response.blob();
}

export async function uploadProductImage(
  imageUri: string,
  productBarcode: string,
  productName?: string
): Promise<string> {
  try {
    console.log('[ImageUpload] Starting upload to Supabase Storage...');

    const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const baseName = sanitizeFileName(productBarcode || productName || 'product');
    const timestamp = Date.now();
    const filePath = `products/${baseName}_${timestamp}.${safeExt}`;

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const contentType = mimeTypes[safeExt] ?? 'image/jpeg';

    const blob = await getBlobFromUri(imageUri);

    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, blob, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.log('[ImageUpload] Upload error:', error.message);
      console.log('[ImageUpload] Falling back to local URI');
      return imageUri;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    console.log('[ImageUpload] Upload successful:', data.publicUrl.substring(0, 60));
    return data.publicUrl;
  } catch (e) {
    console.log('[ImageUpload] Upload failed, using local URI:', (e as Error).message);
    return imageUri;
  }
}
