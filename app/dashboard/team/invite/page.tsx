import Topbar from '@/components/dashboard/Topbar'
import InviteForm from '../InviteForm'

export const metadata = { title: 'Invite Team Member' }

export default function InviteUserPage() {
  return (
    <>
      <Topbar title="Invite Team Member" />
      <InviteForm />
    </>
  )
}
