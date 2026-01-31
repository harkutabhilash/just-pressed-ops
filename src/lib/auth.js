import { createClient } from '@supabase/supabase-js'

// Lazy init — only creates client when first needed (not at import time)
let supabaseClient = null

function getClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase env vars not configured')
    }
    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}

/**
 * Login with username (phone number) and password
 * Step 1: Check if username exists
 * Step 2: Check if account is active
 * Step 3: Verify password
 * Step 4: Fetch permissions and build session
 */
export async function login(username, password) {
  try {
    const supabase = getClient()

    // ─── STEP 1: Check if username exists ────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, username, phone, email, full_name, employee_id, role, password_hash, is_active')
      .eq('username', username.trim())
      .single()

    if (userError || !user) {
      return { success: false, error: 'This phone number is not registered. Please contact your admin.' }
    }

    // ─── STEP 2: Check if account is active ──────────────────
    if (!user.is_active) {
      return { success: false, error: 'This account has been disabled. Please contact your admin.' }
    }

    // ─── STEP 3: Verify password ──────────────────────────────
    const { data: verified, error: rpcError } = await supabase
      .rpc('verify_password', {
        p_password: password.trim(),
        p_hash: user.password_hash
      })

    if (rpcError) {
      console.error('Password verification RPC error:', rpcError)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    if (!verified) {
      return { success: false, error: 'Incorrect password. Please try again.' }
    }

    // ─── STEP 4: Fetch permissions & build session ───────────
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select(`
        module_id,
        can_view,
        can_write,
        can_edit,
        modules (
          module_id,
          module_key,
          module_name,
          icon,
          display_order
        )
      `)
      .eq('user_id', user.user_id)
      .eq('can_view', true)
      .order('modules(display_order)', { ascending: true })

    const session = {
      user_id: user.user_id,
      username: user.username,
      phone: user.phone,
      email: user.email,
      full_name: user.full_name,
      employee_id: user.employee_id,
      role: user.role,
      modules: (permissions || [])
        .filter(p => p.modules)
        .map(p => ({
          module_id: p.modules.module_id,
          module_key: p.modules.module_key,
          module_name: p.modules.module_name,
          icon: p.modules.icon,
          display_order: p.modules.display_order,
          can_view: p.can_view,
          can_write: p.can_write,
          can_edit: p.can_edit
        }))
    }

    // Save session
    localStorage.setItem('jp_session', JSON.stringify(session))

    return { success: true, session }

  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Logout - clear session
 */
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jp_session')
  }
}

/**
 * Get current session from localStorage
 * Returns null if not logged in or running server-side
 */
export function getSession() {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem('jp_session')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
