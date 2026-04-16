import { assertCanEditDashboardModule } from '@/lib/auth/roles'
import NewVehicleMakeClient from './NewVehicleMakeClient'

export const metadata = { title: 'Add Vehicle Make' }

export default async function NewVehicleMakePage() {
  await assertCanEditDashboardModule('website')
  return <NewVehicleMakeClient />
}
