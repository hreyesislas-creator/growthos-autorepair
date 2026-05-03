/**
 * Advisor job-board SMS copy (preview only in Phase 2A — no sending).
 * No database; replace or extend with DB-backed templates later.
 */

export type AdvisorJobSmsTemplateId = 'ready_for_pickup' | 'estimate_followup' | 'service_update'

export type AdvisorJobSmsTemplateContext = {
  customerName: string
  vehicle: string
  shopName?: string | null
}

function shopLabel(shopName?: string | null): string {
  const s = shopName?.trim()
  return s && s.length > 0 ? s : 'our shop'
}

/** Ready-for-pickup SMS body preview. */
export function templateReadyForPickup(ctx: AdvisorJobSmsTemplateContext): string {
  const shop = shopLabel(ctx.shopName)
  return `Hi ${ctx.customerName}, your vehicle (${ctx.vehicle}) is ready for pickup at ${shop}. Reply here or call us if you have questions.`
}

/** Estimate approval / follow-up SMS body preview. */
export function templateEstimateFollowup(ctx: AdvisorJobSmsTemplateContext): string {
  const shop = shopLabel(ctx.shopName)
  return `Hi ${ctx.customerName}, this is ${shop} following up on your repair estimate for ${ctx.vehicle}. Open your estimate in the link we sent, or reply here and we’ll help.`
}

/** Generic service-update SMS body preview. */
export function templateServiceUpdate(ctx: AdvisorJobSmsTemplateContext): string {
  const shop = shopLabel(ctx.shopName)
  return `Hi ${ctx.customerName}, quick update from ${shop} on your ${ctx.vehicle}. Reply here or call us for details.`
}

/** Resolve preview text for a template id (used by the SMS preview modal). */
export function previewAdvisorJobSmsTemplate(
  id: AdvisorJobSmsTemplateId,
  ctx: AdvisorJobSmsTemplateContext,
): string {
  switch (id) {
    case 'ready_for_pickup':
      return templateReadyForPickup(ctx)
    case 'estimate_followup':
      return templateEstimateFollowup(ctx)
    case 'service_update':
      return templateServiceUpdate(ctx)
  }
}
