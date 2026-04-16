import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import InviteForm from '../InviteForm'

export const metadata = { title: 'Invite Team Member' }

export default async function InviteUserPage() {
  await assertCanEditDashboardModule('team')
  return (
    <>
      <Topbar title="Invite Team Member" />
      <InviteForm />
    </>
  )
}
