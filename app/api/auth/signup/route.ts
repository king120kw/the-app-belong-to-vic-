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

    // Try to create user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { onboarding_completed: false }
    });

    if (error) {
      // If user already exists, we force-confirm them to resolve the "stuck" state
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        console.log('User already exists, attempting to force-confirm...');
        
        // Find user by email
        const { data: userData, error: getError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = userData?.users.find(u => u.email === email);
        
        if (existingUser) {
          const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { email_confirm: true }
          );
          
          if (confirmError) throw confirmError;
          
          return NextResponse.json({ 
            user: existingUser,
            message: 'Existing user confirmed successfully' 
          });
        }
      }
      
      console.error('Admin Signup Error:', error);
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
