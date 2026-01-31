import { supabase } from './supabase'

/**
 * Login with username (phone number) and password
 */
export async function login(username, password) {
  try {
    // Step 1: Find user by username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, username, phone, email, full_name, employee_id, role, password_hash, is_active')
      .eq('username', username.trim())
      .single()

    if (userError || !user) {
      return { success: false, error: 'Invalid username or password' }
    }

    if (!user.is_active) {
      return { success: false, error: 'Account is disabled. Contact admin.' }
    }

    // Step 2: Verify password
    // password_hash stored via crypt() in Supabase — use pgcrypto verify
    const { data: verified } = await supabase
      .rpc('verify_password', {
        p_password: password.trim(),
        p_hash: user.password_hash
      })

    if (!verified) {
      return { success: false, error: 'Invalid username or password' }
    }

    // Step 3: Fetch user's module permissions
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

    // Step 4: Build session object
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

    // Step 5: Save to localStorage
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
  localStorage.removeItem('jp_session')
}

/**
 * Get current session
 * Returns null if not logged in
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
