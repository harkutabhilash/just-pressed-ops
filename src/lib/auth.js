import { createClient } from '@supabase/supabase-js'

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
 * Login — validates credentials, saves only user_id + full_name to localStorage.
 */
export async function login(username, password) {
  try {
    const supabase = getClient()

    // ─── STEP 1: Check if username exists ────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, full_name, is_active, password_hash')
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

    // ─── STEP 4: Save minimal session ────────────────────────
    const session = {
      user_id: user.user_id,
      full_name: user.full_name
    }

    localStorage.setItem('jp_session', JSON.stringify(session))

    return { success: true, session }

  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

/**
 * Fetch user's module list from DB.
 * Called by dashboard on load.
 */
export async function fetchUserModules(userId) {
  try {
    const supabase = getClient()

    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select(`
        can_view,
        can_write,
        can_edit,
        modules (
          module_id,
          module_key,
          module_name,
          display_order
        )
      `)
      .eq('user_id', userId)
      .eq('can_view', true)
      .order('modules(display_order)', { ascending: true })

    if (error) {
      console.error('Fetch modules error:', error)
      return []
    }

    return (permissions || [])
      .filter(p => p.modules)
      .map(p => ({
        module_key: p.modules.module_key,
        module_name: p.modules.module_name,
        display_order: p.modules.display_order,
        can_write: p.can_write,
        can_edit: p.can_edit
      }))
  } catch (error) {
    console.error('Fetch modules error:', error)
    return []
  }
}

/**
 * Check permission for a specific module.
 * Called when user opens a module page.
 */
export async function checkModulePermission(userId, moduleKey) {
  try {
    const supabase = getClient()

    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        can_view,
        can_write,
        can_edit,
        modules (module_key)
      `)
      .eq('user_id', userId)
      .filter('modules.module_key', 'eq', moduleKey)
      .single()

    if (error || !data) {
      return { allowed: false }
    }

    return {
      allowed: data.can_view,
      can_view: data.can_view,
      can_write: data.can_write,
      can_edit: data.can_edit
    }
  } catch (error) {
    console.error('Check permission error:', error)
    return { allowed: false }
  }
}

/**
 * Logout
 */
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jp_session')
  }
}

/**
 * Get session — returns { user_id, full_name } or null
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
