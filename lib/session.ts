export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  boatIds: string[]     // empty = access to all boats
  permissions: string[] // empty = use role defaults
}

const SESSION_KEY = 'bb_session'

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(user: SessionUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// Returns true if user has edit permission for the given module key
export function hasEditPerm(session: SessionUser | null, module: string): boolean {
  if (!session) return false
  if (session.role === 'admin') return true
  return session.permissions.includes(`${module}:edit`)
}
