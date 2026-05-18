import { Platform } from 'react-native';

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
}

export async function uploadProductImage(
  imageUri: string,
  _productBarcode: string,
  _productName?: string
): Promise<string> {
  console.log('[ImageUpload] Returning local URI (no cloud storage configured)');
  return imageUri;
}
