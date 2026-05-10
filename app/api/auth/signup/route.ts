import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Create the user with administrative privileges and automatically confirm their email.
    // This bypasses the need for the user to wait for a verification email.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        first_name: full_name ? full_name.split(' ')[0] : 'User'
      }
    })

    if (error) {
      console.error('Admin Signup Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      user: data.user,
      message: 'User created and auto-confirmed successfully' 
    })
  } catch (error: any) {
    console.error('Signup API Error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
