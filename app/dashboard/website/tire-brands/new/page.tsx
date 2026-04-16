import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import NewTireBrandClient from './NewTireBrandClient'

export const metadata = { title: 'Add Tire Brand' }

export default async function NewTireBrandPage() {
  await assertCanEditDashboardModule('website')
  return <NewTireBrandClient />
}
