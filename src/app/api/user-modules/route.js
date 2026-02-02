// src/app/api/user-modules/route.js
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    // Get session from cookie or localStorage (client will send it)
    const cookieStore = cookies();
    
    // For now, get user_id from query param (client will send it)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch user's modules with permissions
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select(`
        can_view,
        can_write,
        can_edit,
        modules (
          module_id,
          module_name,
          module_key,
          display_order,
          icon
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching modules:', error);
      return Response.json({ error: 'Failed to fetch modules' }, { status: 500 });
    }

    // Transform the data
    const modules = permissions.map(p => ({
      module_id: p.modules.module_id,
      module_name: p.modules.module_name,
      module_key: p.modules.module_key,
      display_order: p.modules.display_order,
      icon: p.modules.icon,
      can_view: p.can_view,
      can_write: p.can_write,
      can_edit: p.can_edit,
    }));

    return Response.json({ modules });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
