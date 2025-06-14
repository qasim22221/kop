import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create a Supabase client with the service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get the user by email
    // Remove any usage of supabase.auth.admin and replace with a placeholder comment or remove the block entirely if not needed
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (userError) {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { error: 'Failed to verify email status' },
        { status: 500 }
      );
    }

    // Check if user exists and if email is confirmed
    const user = users?.find(u => u.email === email);
    
    if (user) {
      if (user.email_confirmed_at) {
        return NextResponse.json({ verified: true });
      } else {
        // For development purposes, we can manually verify the email
        // In production, this would be removed or secured with proper admin authentication
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );

        if (updateError) {
          console.error("Error updating user:", updateError);
          return NextResponse.json(
            { error: 'Failed to verify email' },
            { status: 500 }
          );
        }

        return NextResponse.json({ verified: true, manuallyVerified: true });
      }
    } else {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}