import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const COACH_ID = '00000000-0000-0000-0000-000000000001'

function extractMediaUrl(record: any): string | null {
  const meta = record.metadata
  if (!meta) return null
  if (typeof meta === 'object') return meta.url || meta.publicUrl || null
  if (typeof meta === 'string' && meta.startsWith('http')) return meta
  return null
}

async function getGeoInfo(supabase: any, clientIp: string) {
  const { data: cached } = await supabase
    .from('ip_location_cache')
    .select('*')
    .eq('ip_address', clientIp)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (cached) return cached

  try {
    const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`)
    if (geoRes.ok) {
      const g = await geoRes.json()
      if (!g.error) {
        const geoInfo = {
          ip_address: clientIp,
          country_code: g.country_code || 'US',
          country_name: g.country_name || 'United States',
          city: g.city || 'Unknown',
          timezone: g.timezone || 'UTC',
          currency_code: g.currency || 'USD',
          currency_symbol: g.currency_symbol || '$',
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        }
        supabase.from('ip_location_cache').upsert(geoInfo, { onConflict: 'ip_address' }).then()
        return geoInfo
      }
    }
  } catch (e) {
    console.error('Geo lookup failed:', e)
  }

  return { country_code: 'US', country_name: 'United States', city: 'Unknown', currency_code: 'USD', currency_symbol: '$', timezone: 'UTC' }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const { record, type, table, system_context } = payload

    if (type !== 'INSERT' || table !== 'messages' || record?.sender_id === COACH_ID) {
      return NextResponse.json({ message: 'Ignored' })
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!apiKey) throw new Error('NEXT_PUBLIC_OPENAI_API_KEY not set')

    const supabase = createServerSupabaseClient()
    const conversationId = record.conversation_id

    const clientIp =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      '8.8.8.8'
    const geoInfo = await getGeoInfo(supabase, clientIp)

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)

    const userId = participants?.find((p: any) => p.user_id !== COACH_ID)?.user_id
    if (!userId) return NextResponse.json({ message: 'No human' })

    const [onboardingRes, profileRes, nutritionRes, messagesRes, scannedProductsRes] = await Promise.all([
      supabase.from('onboarding_responses').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('food_analysis_history').select('*').eq('user_id', userId).order('analyzed_at', { ascending: false }).limit(7),
      supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(20),
      supabase.from('food_analysis_history').select('food_name, calories, protein, carbs, fat, analyzed_at').eq('user_id', userId).order('analyzed_at', { ascending: false }).limit(3),
    ])

    const profile = profileRes.data
    const onboarding = onboardingRes.data || {}
    const recentMessages = ((messagesRes.data || []) as any[]).reverse()
    const recentScans = scannedProductsRes.data || []

    const userName = profile?.full_name || 'there'
    const rawTime = system_context?.current_time || new Date().toISOString()
    const currentTime = new Date(rawTime).toLocaleString(system_context?.language || 'en-US', {
      timeZone: system_context?.time_zone || geoInfo.timezone || 'UTC',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    const totalCaloriesToday = (recentScans as any[])
      .filter((s: any) => s.analyzed_at && new Date(s.analyzed_at).toDateString() === new Date().toDateString())
      .reduce((sum: number, s: any) => sum + (s.calories || 0), 0)

    const calorieGoal = (onboarding as any).daily_calorie_goal || 2000
    const caloriesRemaining = calorieGoal - totalCaloriesToday

    const systemPrompt = `You are the Omni-Coach AI, a world-class clinical nutritionist, pharmacist, and personal health advisor for ${userName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
REAL-TIME AWARENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT DATE & TIME: ${currentTime}
USER'S LOCATION: ${geoInfo.city || 'Unknown'}, ${geoInfo.country_name || 'Unknown'}
LOCAL CURRENCY: ${geoInfo.currency_symbol || '$'} (${geoInfo.currency_code || 'USD'})

━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${userName}
Primary Goal: ${(onboarding as any).goal || 'Maintain a healthy lifestyle'}
Dietary Restrictions: ${((onboarding as any).dietary_lifestyle || []).join(', ') || 'None specified'}
Medical Conditions: ${(onboarding as any).medical_conditions || 'None reported'}
Daily Calorie Target: ${calorieGoal} kcal/day
Calories logged today: ${totalCaloriesToday} kcal (${caloriesRemaining > 0 ? `${caloriesRemaining} kcal remaining` : `${Math.abs(caloriesRemaining)} kcal over goal`})

━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECENT FOOD SCANS (Last 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(recentScans as any[]).length > 0 ? (recentScans as any[]).map((s: any) => `• ${s.food_name || 'Unknown'}: ${s.calories || 0} kcal (${s.analyzed_at ? new Date(s.analyzed_at).toLocaleDateString() : 'recent'})`).join('\n') : 'No recent food scans.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
LATEST DEPTH ANALYSIS (Context)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${system_context?.latest_analysis ? JSON.stringify(system_context.latest_analysis, null, 2) : 'No manual analysis context provided.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE MANDATES (NEVER BREAK THESE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. YOU KNOW THE EXACT DATE, TIME, AND USER LOCATION. Never claim you don't.
2. CURRENCY & BUDGET AWARENESS: Always use ${geoInfo.currency_symbol} for prices.
3. MEDICAL PRECISION: Always factor in user's conditions (${(onboarding as any).medical_conditions || 'none'}) in recommendations.
4. CALORIE INTELLIGENCE: You know the user has consumed ${totalCaloriesToday} kcal today out of a ${calorieGoal} kcal goal.
5. MULTIMODAL: If given an image, provide expert food/product analysis. If given a voice transcript, respond to it naturally.
6. LANGUAGE MANDATE: Auto-detect the user's language. If they write in Arabic or Urdu, you MUST respond in that EXACT language. You are fluent in ARABIC, URDU, and ENGLISH.
7. ACCURACY & HALLUCINATION PREVENTION: Do not make up nutritional values or medical history.

RESPONSE FORMAT: Respond directly with your detailed markdown message. Do NOT wrap it in a JSON object.`

    const msgType = record.message_type
    const imageUrl = msgType === 'image' ? extractMediaUrl(record) : null
    let transcribedText = ''

    if (msgType === 'voice') {
      const voiceUrl = extractMediaUrl(record)
      if (voiceUrl) {
        try {
          const audioRes = await fetch(voiceUrl)
          if (audioRes.ok) {
            const audioBlob = await audioRes.blob()
            const formData = new FormData()
            formData.append('file', audioBlob, 'voice.webm')
            formData.append('model', 'whisper-1')
            const transRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${apiKey}` },
              body: formData,
            })
            if (transRes.ok) {
              const tData = await transRes.json()
              transcribedText = tData.text || ''
            }
          }
        } catch (e) { console.error('Voice transcription failed:', e) }
      }
    }

    const chatContext: any[] = recentMessages.map((m: any) => ({
      role: m.sender_id === COACH_ID ? 'assistant' : 'user',
      content: m.sender_id === COACH_ID
        ? (m.content || '')
        : (m.message_type === 'text' ? (m.content || '') : `[${m.message_type} message shared]`),
    })).filter((m: any) => m.content)

    let content = record.content || ''
    const scanCtx = record.metadata?.scannedProductContext
    let ctxSummary = ''

    if (scanCtx) {
      ctxSummary = `[Context: User scanned ${scanCtx.productName || scanCtx.name}. ` +
        `Macros: ${scanCtx.calories}kcal, P:${scanCtx.protein}g, C:${scanCtx.carbs}g, F:${scanCtx.fat}g. ` +
        `Political/Ethical: ${scanCtx.political_warning || 'None'}]`
      content = `${ctxSummary}\n\n${content}`
    }

    const currentUserMsg: any = { role: 'user', content }
    if (imageUrl) {
      currentUserMsg.content = [
        { type: 'text', text: content || 'Please analyze this image.' },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
      ]
    } else if (msgType === 'voice' && transcribedText) {
      currentUserMsg.content = `[Voice message]: ${transcribedText}${ctxSummary ? `\n\n${ctxSummary}` : ''}`
    }

    const chatWithCurrent = chatContext.filter((m: any, i: number) =>
      !(i === chatContext.length - 1 && m.role === 'user' && m.content === record.content)
    )
    chatWithCurrent.push(currentUserMsg)

    // Idempotency check
    const { data: existingReply } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('sender_id', COACH_ID)
      .gt('created_at', record.created_at)
      .limit(1)
      .maybeSingle()

    if (existingReply) {
      return NextResponse.json({ message: 'Already replied', id: existingReply.id })
    }

    // Create placeholder message
    const { data: newMsg, error: insertErr } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: COACH_ID,
      content: '',
      message_type: 'text',
      is_read: false,
      metadata: { replying_to: record.id },
    }).select().single()

    if (insertErr || !newMsg) throw new Error(`Failed to create message placeholder: ${insertErr?.message}`)

    // AI call with streaming (stream to DB, not to client)
    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, ...chatWithCurrent.slice(-20)],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!openAiRes.ok) throw new Error(`OpenAI error: ${await openAiRes.text()}`)
    if (!openAiRes.body) throw new Error('No stream body from AI')

    const reader = openAiRes.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let fullReply = ''
    let lastUpdateTime = Date.now()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            const delta = data.choices[0]?.delta?.content || ''
            if (delta) fullReply += delta
          } catch {}
        }
      }

      if (Date.now() - lastUpdateTime > 500 && fullReply.length > 0) {
        lastUpdateTime = Date.now()
        supabase.from('messages').update({ content: fullReply }).eq('id', newMsg.id).then()
      }
    }

    if (!fullReply) {
      fullReply = "I apologize, but I encountered a technical glitch while thinking. Could you please try asking that again? I'm ready to help!"
    }

    await supabase.from('messages').update({ content: fullReply, delivered_at: new Date().toISOString() }).eq('id', newMsg.id)
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_content: fullReply.substring(0, 200),
      last_message_type: 'text',
      last_message_sender_id: COACH_ID,
    } as any).eq('id', conversationId)

    return NextResponse.json({ success: true, message_id: newMsg.id })
  } catch (err: any) {
    console.error('Coach Reply Error:', err.message)
    return NextResponse.json({
      error: true,
      message: err.message,
      actionable_feedback: 'The AI Coach is momentarily overwhelmed. Re-sending your message might help.',
    })
  }
}
