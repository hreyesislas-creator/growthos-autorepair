import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import NewGalleryItemClient from './NewGalleryItemClient'

export const metadata = { title: 'Add Gallery Photo' }

export default async function NewGalleryItemPage() {
  await assertCanEditDashboardModule('website')
  return <NewGalleryItemClient />
}
