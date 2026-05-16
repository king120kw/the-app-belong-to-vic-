import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const COACH_ID = '00000000-0000-0000-0000-000000000001';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all users with their timezone
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, timezone');

    if (usersError) throw usersError;

    const summaryResults = [];

    for (const user of users) {
      const tz = user.timezone || 'UTC';
      const now = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false
      }).format(new Date());

      // Only run at midnight (hour 0) in their timezone
      if (now === "0") {
        const userId = user.user_id;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        // Fetch user data for the day
        const { data: progress } = await supabase
          .from('daily_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('progress_date', dateStr)
          .maybeSingle();

        const { data: usage } = await supabase
          .from('system_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', dateStr)
          .lte('created_at', dateStr + 'T23:59:59');

        // Generate simple summary (heuristic)
        const summary = `
🌟 *VICALARY Midnight Report*
📅 Date: ${dateStr}

*Daily Stats:*
- Calories: ${progress?.calories_consumed || 0} / ${progress?.calories_goal || 2000} kcal
- Protein: ${progress?.protein_consumed || 0}g
- App Activity: ${usage?.length || 0} interactions

*Coach's Word:*
${(progress?.calories_consumed || 0) > 0 ? "Great job logging your meals today! Consistency is the path to health." : "We missed your logs today. Let's get back on track tomorrow!"}

Rest well! Your personalized plan for tomorrow is waiting in the Cookbook.
        `.trim();

        // Send as message from Coach
        const { error: msgError } = await supabase.from('messages').insert({
          sender_id: COACH_ID,
          receiver_id: userId,
          content: summary,
          message_type: 'text',
          metadata: { type: 'daily_summary', date: dateStr }
        });

        if (!msgError) summaryResults.push(userId);
      }
    }

    return new Response(JSON.stringify({ 
      status: 'success', 
      triggered_for: summaryResults.length,
      users_processed: users.length 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
})
