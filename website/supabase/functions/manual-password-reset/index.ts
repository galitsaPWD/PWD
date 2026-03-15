// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code, newPassword } = await req.json()

    if (!email || !code || !newPassword) {
      throw new Error('Missing email, code, or password')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Verify Code using the secure RPC (ensures server-side time check)
    const { data: isValid, error: verifyError } = await supabaseAdmin.rpc('verify_reset_code', {
      p_email: email,
      p_code: code
    })

    if (verifyError || !isValid) {
      throw new Error('Invalid or expired verification code')
    }

    // 3. Update Password in Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        // We first need the user ID by email
        (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id || '',
        { password: newPassword }
    )
    
    // Better way to update by email if ID lookup fails
    if (updateError) {
        const { data: userData, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (!targetUser) throw new Error('User account not found');

        const { error: secondUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            targetUser.id,
            { password: newPassword }
        );
        if (secondUpdateError) throw secondUpdateError;
    }

    // 4. Clean up the reset code
    await supabaseAdmin
      .from('password_resets')
      .delete()
      .eq('id', resetData.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
