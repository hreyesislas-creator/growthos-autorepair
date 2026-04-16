'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deactivateTeamMember } from './actions'

export function DeactivateTeamMemberButton({
  tenantUserId,
  role,
  isActive,
  canManage = true,
}: {
  tenantUserId: string
  role: string
  isActive: boolean
  canManage?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  if (!canManage || role === 'owner' || !isActive) return null

  async function onDeactivate() {
    if (!confirm("Remove this user's access to this shop?")) return
    setPending(true)
    try {
      const res = await deactivateTeamMember(tenantUserId)
      if ('error' in res) {
        alert(res.error)
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      className="btn-ghost"
      style={{ fontSize: 12, padding: '4px 10px' }}
      disabled={pending}
      onClick={onDeactivate}
    >
      Deactivate
    </button>
  )
}
