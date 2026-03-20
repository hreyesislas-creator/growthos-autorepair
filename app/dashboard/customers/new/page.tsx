import Topbar from '@/components/dashboard/Topbar'
import CustomerForm from '../CustomerForm'

export const metadata = { title: 'Add Customer' }

export default function NewCustomerPage() {
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
