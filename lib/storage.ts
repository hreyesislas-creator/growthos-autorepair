/**
 * Client-side Supabase Storage helpers.
 *
 * These functions run in the browser and use the authenticated browser client
 * so that uploads are scoped to the signed-in user's session.
 *
 * Never import this file from Server Actions or server-only modules — the
 * browser client relies on document.cookie which is not available server-side.
 */

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'inspection-photos'

export interface UploadResult {
  url: string
}

/**
 * Uploads a photo file to the 'inspection-photos' Supabase Storage bucket and
 * returns the public URL.
 *
 * @param file             - The File object from an <input type="file"> element.
 * @param inspectionItemId - The inspection_items.id the photo belongs to.
 *                           Used as a path prefix so photos are grouped by item.
 */
export async function uploadInspectionPhoto(
  file: File,
  inspectionItemId: string,
): Promise<UploadResult> {
  const supabase = createClient()

  const extFromName = file.name.includes('.') ? file.name.split('.').pop() : null
  const extFromType = file.type.startsWith('image/') ? file.type.split('/')[1] : null
  const ext         = extFromName || extFromType || 'jpg'
  const filename    = `${inspectionItemId}-${Date.now()}.${ext}`
  const path        = `items/${filename}`

  console.log('[uploadInspectionPhoto] starting upload', {
    inspectionItemId,
    filename: file.name,
    size: file.size,
    type: file.type,
    storagePath: path,
  })

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert:       false,
    })

  if (uploadError) {
    console.error('[uploadInspectionPhoto] storage upload failed', uploadError)
    throw new Error(`[uploadInspectionPhoto] Upload failed: ${uploadError.message}`)
  }

  console.log('[uploadInspectionPhoto] storage upload succeeded, resolving public URL')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  if (!data?.publicUrl) {
    console.error('[uploadInspectionPhoto] getPublicUrl returned no URL', { path, data })
    throw new Error('[uploadInspectionPhoto] Could not resolve public URL after upload')
  }

  console.log('[uploadInspectionPhoto] public URL resolved', data.publicUrl)

  return { url: data.publicUrl }
}

export interface SavePhotoResult {
  success: true
}

/**
 * Persists an already-uploaded inspection photo URL to the
 * inspection_item_photos table.
 *
 * Call this after uploadInspectionPhoto() succeeds.
 *
 * @param inspectionItemId - The inspection_items.id to attach the photo to.
 * @param photoUrl         - The public Storage URL returned by uploadInspectionPhoto().
 */
export async function saveInspectionPhoto(
  inspectionItemId: string,
  photoUrl: string,
): Promise<SavePhotoResult> {
  const supabase = createClient()

  // Fetch tenant_id from the inspection_items row — avoids requiring the
  // caller to pass it separately.
  const { data: itemRow, error: itemError } = await supabase
    .from('inspection_items')
    .select('tenant_id')
    .eq('id', inspectionItemId)
    .single()

  if (itemError || !itemRow?.tenant_id) {
    console.error('[saveInspectionPhoto] failed to fetch tenant_id from inspection_items', {
      inspectionItemId,
      itemError,
      itemRow,
    })
    throw new Error(
      `[saveInspectionPhoto] Could not resolve tenant_id for inspection_item ${inspectionItemId}: ${itemError?.message ?? 'row not found'}`,
    )
  }

  const tenantId = itemRow.tenant_id

  console.log('[saveInspectionPhoto] inserting row', {
    tenantId,
    inspectionItemId,
    photoUrl,
  })

  const { error } = await supabase
    .from('inspection_item_photos')
    .insert({
      tenant_id:          tenantId,
      inspection_item_id: inspectionItemId,
      image_url:          photoUrl,
    })

  if (error) {
    console.error('[saveInspectionPhoto] DB insert failed', error)
    throw new Error(`[saveInspectionPhoto] DB insert failed: ${error.message}`)
  }

  console.log('[saveInspectionPhoto] row inserted successfully')

  return { success: true }
}
