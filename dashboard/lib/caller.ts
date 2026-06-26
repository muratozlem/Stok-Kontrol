import { headers } from 'next/headers'

export interface CallerContext {
  userId: string
  role: string
  locationId: string | null
}

export async function getCallerContext(): Promise<CallerContext> {
  const h = await headers()
  return {
    userId: h.get('x-caller-id') ?? '',
    role: h.get('x-caller-role') ?? '',
    locationId: h.get('x-caller-location-id') || null,
  }
}

export function isSuperAdmin(ctx: CallerContext): boolean {
  return ctx.role === 'super_admin'
}
