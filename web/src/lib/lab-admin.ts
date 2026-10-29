// Admin side of lab accounts (supabase/accounts.sql): list every account,
// approve, reject, suspend or reactivate it, hand out the admin role, and
// pick the Kanban boards a newly approved member joins. Every call goes
// through a security-definer RPC that checks is_lab_admin() itself, so
// hiding the UI from non-admins is only a convenience.
import { supabase } from './auth/supabase'
import type { AccountStatus } from './account'
import { isStudentRole } from './account'

export interface LabAccount {
  id: string
  email: string
  full_name: string | null
  preferred_name: string | null
  lab_role: string | null
  cohort: number | null
  staff_id: string | null
  research_topic: string | null
  supervisor_id: string | null
  avatar_url: string | null
  status: AccountStatus
  is_admin: boolean
  onboarded_at: string | null
  approved_at: string | null
  created_at: string
  last_sign_in_at: string | null
}

export interface ReviewBoard {
  id: string
  name: string
  visibility: string
}

type Result<T> = { data: T; error: null } | { data: null; error: string }

export async function listLabAccounts(): Promise<Result<LabAccount[]>> {
  if (!supabase) return { data: null, error: 'Not configured' }
  const { data, error } = await supabase.rpc('lab_accounts')
  if (error) return { data: null, error: error.message }
  return { data: (data ?? []) as LabAccount[], error: null }
}

export async function reviewLabAccount(
  id: string,
  status: AccountStatus,
  boardIds: string[] = [],
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const { error } = await supabase.rpc('lab_review_account', {
    target: id,
    new_status: status,
    board_ids: boardIds,
  })
  return { error: error?.message ?? null }
}

export async function setLabAdmin(id: string, flag: boolean): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not configured' }
  const { error } = await supabase.rpc('lab_set_admin', { target: id, flag })
  return { error: error?.message ?? null }
}

// Boards the admin can see, for the "join on approval" picker. A missing
// Kanban schema simply means no picker.
export async function listReviewBoards(): Promise<ReviewBoard[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('kanban_boards')
    .select('id, name, visibility')
    .is('archived_at', null)
    .order('name')
  if (error) return []
  return (data ?? []) as ReviewBoard[]
}

// Boards ticked by default when approving, by lab role (docs/auth/design.md):
// students join the student research and publication boards, researchers
// and staff also the assistant board, lecturers every board.
export function defaultBoardsFor(role: string | null, boards: ReviewBoard[]): string[] {
  const has = (b: ReviewBoard, ...words: string[]) => words.some((w) => b.name.toLowerCase().includes(w))
  if (role === 'dosen') return boards.map((b) => b.id)
  const student = boards.filter((b) => has(b, 'mahasiswa', 'student', 'publikasi', 'publication'))
  if (isStudentRole(role)) return student.map((b) => b.id)
  if (role === 'peneliti' || role === 'staf') {
    return [...student, ...boards.filter((b) => has(b, 'assistant', 'asisten'))].map((b) => b.id)
  }
  return []
}
