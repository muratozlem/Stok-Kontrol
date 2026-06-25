export const dynamic = 'force-dynamic'
import { createServerSupabase } from '@/lib/supabase-server'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const supabase = createServerSupabase()

  const [profRes, locRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('locations').select('id, name').order('name'),
  ])

  return (
    <UsersClient
      initialProfiles={profRes.data ?? []}
      locations={locRes.data ?? []}
    />
  )
}
