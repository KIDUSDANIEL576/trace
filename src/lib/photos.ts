import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { BUCKETS, TABLES } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

const SIGNED_URL_TTL_S = 604800; // 7 days; regenerated on every canvas-list fetch

/** Raised when a couple hits the fair-use storage ceiling (5,000 photos /
 * 10 GB). Unreachable in normal use — a photo a day takes 13 years — so the
 * message explains rather than scolds. */
export class PhotoCapError extends Error {
  constructor() {
    super(
      "You've filled your photo storage — that's thousands of pictures. " +
        'Delete a photo canvas to make room.'
    );
    this.name = 'PhotoCapError';
  }
}

function asCapError(error: { message?: string } | null): Error | null {
  if (!error) return null;
  if (error.message?.includes('photo_cap_')) return new PhotoCapError();
  return error as Error;
}

/** Opens the library or camera; resolves to a local uri, or null on cancel/denied. */
export async function pickPhoto(source: 'library' | 'camera'): Promise<string | null> {
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;
  } else {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return null;
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/** Uploads the photo and creates the photo canvas row. Returns the new canvas id. */
export async function createPhotoCanvas(coupleId: string, uri: string): Promise<string> {
  const path = `${coupleId}/${Crypto.randomUUID()}.jpg`;
  const buf = await fetch(uri).then((r) => r.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKETS.photos)
    .upload(path, buf, { contentType: 'image/jpeg' });
  const capped = asCapError(uploadError);
  if (capped) throw capped;

  const { data, error } = await supabase
    .from(TABLES.canvases)
    .insert({ couple_id: coupleId, kind: 'photo', photo_url: path })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Uploads a photo to use as a canvas *background* (distinct from a photo
 * canvas, which is a drawing surface of its own). Returns the storage path.
 */
export async function uploadBackgroundPhoto(coupleId: string, uri: string): Promise<string> {
  const path = `${coupleId}/bg-${Crypto.randomUUID()}.jpg`;
  const buf = await fetch(uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKETS.photos)
    .upload(path, buf, { contentType: 'image/jpeg' });
  const capped = asCapError(error);
  if (capped) throw capped;
  return path;
}

/** Signed URL for a photo in the private bucket (null if signing fails). */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from(BUCKETS.photos)
    .createSignedUrl(path, SIGNED_URL_TTL_S);
  return data?.signedUrl ?? null;
}
