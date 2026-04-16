import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import NewSpecialClient from './NewSpecialClient'

export const metadata = { title: 'Add Special' }

export default async function NewSpecialPage() {
  await assertCanEditDashboardModule('website')
  return <NewSpecialClient />
}
