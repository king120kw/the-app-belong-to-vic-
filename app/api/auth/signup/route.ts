import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 1. Safety Check: Check for orphaned public profiles with this email
    // This handles cases where auth.users was deleted but public data remained.
    // This ensures that when a user signs up again, they start with a CLEAN SLATE.
    const { data: orphanedProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (orphanedProfile) {
      console.log(`[Signup-Defensive] Found orphaned profile for ${email}. Performing safety wipe...`);
      // Wipe storage
      const buckets = ['user-avatars', 'food-images', 'chat-media'];
      for (const bucket of buckets) {
        try {
          const { data: files } = await supabaseAdmin.storage.from(bucket).list(orphanedProfile.id);
          if (files && files.length > 0) {
            const paths = files.map(f => `${orphanedProfile.id}/${f.name}`);
            await supabaseAdmin.storage.from(bucket).remove(paths);
          }
        } catch (e) {}
      }
      // Delete from DB (The cascade will handle related tables if SQL was applied)
      await supabaseAdmin.from('user_profiles').delete().eq('id', orphanedProfile.id);
      console.log(`[Signup-Defensive] Orphaned data for ${email} has been purged.`);
    }

    // 2. Try to create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { onboarding_completed: false }
    });

    // If user already exists in auth.users, handle existing account logic
    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        const isSuperReset = email.toLowerCase().includes('super');
        
        // Find existing auth user
        const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
        const users = userData?.users || [];
        const existingUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
          if (isSuperReset) {
            console.log(`[HARD RESET] Deleting existing user ${existingUser.id} and all data...`);
            
            // Storage Cleanup
            const buckets = ['user-avatars', 'food-images', 'chat-media'];
            for (const bucket of buckets) {
              try {
                const { data: files } = await supabaseAdmin.storage.from(bucket).list(existingUser.id);
                if (files && files.length > 0) {
                  const paths = files.map(f => `${existingUser.id}/${f.name}`);
                  await supabaseAdmin.storage.from(bucket).remove(paths);
                }
              } catch (e) {}
            }

            // Delete user profile (cascades)
            await supabaseAdmin.from('user_profiles').delete().eq('id', existingUser.id);
            
            // Delete from auth.users
            await supabaseAdmin.auth.admin.deleteUser(existingUser.id);

            // Re-create the user
            const { data: newData, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { onboarding_completed: false }
            });
            
            if (createError) throw createError;
            
            return NextResponse.json({ 
              user: newData.user,
              message: 'Account reset and re-created successfully' 
            });
          }

          // Normal user: just confirm them
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
          
          return NextResponse.json({ 
            user: existingUser,
            message: 'Existing user confirmed successfully' 
          });
        }
      }
      
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      user: data.user,
      message: 'User created and confirmed successfully' 
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
