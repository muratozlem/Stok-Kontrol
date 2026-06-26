export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCallerContext, isSuperAdmin } from '@/lib/caller'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const supabase = createServerSupabase()
  const caller = await getCallerContext()
  const superAdmin = isSuperAdmin(caller)

  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (!superAdmin) {
    profilesQuery = profilesQuery.eq('location_id', caller.locationId ?? '')
  }

  const [profRes, locRes] = await Promise.all([
    profilesQuery,
    superAdmin
      ? supabase.from('locations').select('id, name').order('name')
      : supabase.from('locations').select('id, name').eq('id', caller.locationId ?? '').order('name'),
  ])

  return (
    <UsersClient
      initialProfiles={profRes.data ?? []}
      locations={locRes.data ?? []}
    />
  )
}
