import type { useCanvasRef } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type CanvasRef = ReturnType<typeof useCanvasRef>;

/**
 * Snapshots the live Skia canvas and opens the system share sheet — the
 * growth loop: your drawing, straight to Instagram/WhatsApp/wherever.
 * Returns false when sharing isn't possible (web, snapshot failed, cancelled
 * is still true — the sheet opened).
 */
export async function shareCanvas(ref: CanvasRef): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const image = ref.current?.makeImageSnapshot();
    if (!image) return false;
    const base64 = image.encodeToBase64();
    const uri = `${FileSystem.cacheDirectory}trace.png`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your trace' });
    return true;
  } catch {
    return false;
  }
}
