import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import Topbar from '@/components/dashboard/Topbar'
import CustomerForm from '../CustomerForm'

export const metadata = { title: 'Add Customer' }

export default async function NewCustomerPage() {
  await assertCanEditDashboardModule('customers')
  return (
    <>
      <Topbar title="Add Customer" />
      <div className="dash-content">
        <div className="card" style={{ maxWidth: 720 }}>
          <CustomerForm />
        </div>
      </div>
    </>
  )
}
