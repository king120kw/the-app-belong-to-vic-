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

    console.log(`[Coach-Reply] Incoming request: ${type} on ${table}. Sender: ${record?.sender_id}`)
    if (type !== 'INSERT' || table !== 'messages' || record?.sender_id === COACH_ID) {
      console.log(`[Coach-Reply] Ignoring message. Type: ${type}, Table: ${table}, Sender: ${record?.sender_id}`)
      return NextResponse.json({ message: 'Ignored' })
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!apiKey) throw new Error('NEXT_PUBLIC_OPENAI_API_KEY not set')

    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const supabase = supabaseAdmin
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
    console.log(`[Coach-Reply] Resolved Human User: ${userId} in Conv: ${conversationId}`)
    if (!userId) {
      console.warn(`[Coach-Reply] No human user found in conversation ${conversationId}. Participants:`, participants)
      return NextResponse.json({ message: 'No human' })
    }

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

    const systemPrompt = `You are Vicalary Health Intelligence, a sophisticated and empathetic conversational health coach for ${userName}. You are not a chatbot; you are a deeply intelligent advisor capable of complex reasoning, visual analysis, and long-term memory.

CONVERSATIONAL PHILOSOPHY:
1. Speak naturally and intelligently. Avoid robotic patterns, repetitive structures, or generic health advice.
2. Maintain perfect continuity. If the user mentions something earlier in the session, you remember it and factor it into your current reasoning.
3. Be supportive but professional. Your tone should feel like a human expert who truly understands ${userName}'s health journey.

CRITICAL FORMATTING RULES:
- NEVER use asterisks (*), hashtags (#), or markdown bullet points (- or •).
- NEVER use robotic headers or bolded template patterns.
- Use clean, natural paragraphs. Use double line breaks to separate ideas.
- If you need to list items, use natural phrasing like "First, you could try..." or "Additionally, I recommend..."
- Ensure your response is easy to read on a mobile screen without looking like code or a report.

MULTIMODAL & CONTEXTUAL REASONING:
- If an image is shared, analyze it with clinical precision. Identify the food, estimate portion sizes, and calculate calories relative to the user's daily progress.
- FACTOR IN THE FOLLOWING METRICS:
  - Current Time/Date: ${currentTime}
  - User Location: ${geoInfo.city}, ${geoInfo.country_name}
  - Today's Consumption: ${totalCaloriesToday} kcal
  - Remaining Calories: ${caloriesRemaining} kcal (Goal: ${calorieGoal} kcal)
  - Primary Health Goal: ${(onboarding as any).goal || 'General Wellness'}
  - Restrictions/Conditions: ${((onboarding as any).dietary_lifestyle || []).join(', ') || 'None'} | ${(onboarding as any).medical_conditions || 'None reported'}
- LATEST DEPTH ANALYSIS CONTEXT: ${system_context?.latest_analysis ? JSON.stringify(system_context.latest_analysis) : 'None'}

INTELLIGENCE DIRECTIVES:
- LANGUAGE: Auto-detect the user's language. If they speak Arabic or Urdu, respond fluently in those languages.
- REASONING: Before you reply, internally evaluate the user's intent. Are they asking for motivation, data analysis, or a recommendation? Tailor your depth to their specific need.
- CONSISTENCY: If they ask about a previous meal or scan mentioned in the history, you know exactly what they are referring to.

Respond directly with your conversational reply. Avoid all robotic formatting.`

    const msgType = record.message_type
    // Support image URL from metadata even for text messages (common for context handoff)
    const imageUrl = msgType === 'image' ? extractMediaUrl(record) : (record.metadata?.url || null)
    let transcribedText = ''
    if (msgType === 'voice') {
      const voiceUrl = extractMediaUrl(record)
      console.log(`[Coach-Reply] Processing Voice Message: ${voiceUrl}`)
      if (voiceUrl) {
        try {
          const audioRes = await fetch(voiceUrl)
          if (audioRes.ok) {
            const audioBlob = await audioRes.blob()
            const formData = new FormData()
            // Ensure we use a supported extension for Whisper
            const fileExtension = record.metadata?.mimeType?.split('/')[1] || 'webm'
            formData.append('file', audioBlob, `voice.${fileExtension}`)
            formData.append('model', 'whisper-1')
            
            console.log(`[Coach-Reply] Transcribing with Whisper...`)
            const transRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${apiKey}` },
              body: formData,
            })
            
            if (transRes.ok) {
              const tData = await transRes.json()
              transcribedText = tData.text || ''
              console.log(`[Coach-Reply] Transcription Success: "${transcribedText}"`)
            } else {
              const errText = await transRes.text()
              console.error(`[Coach-Reply] Whisper Error: ${errText}`)
            }
          }
        } catch (e) { 
          console.error('[Coach-Reply] Voice processing failed:', e)
          transcribedText = '[User sent a voice message that could not be transcribed]'
        }
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
        frequency_penalty: 0.5,
        presence_penalty: 0.5
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
        // Final cleaning of markdown symbols just in case
        const cleanReply = fullReply.replace(/[*#]/g, '')
        supabase.from('messages').update({ content: cleanReply }).eq('id', newMsg.id).then()
      }
    }

    if (!fullReply) {
      fullReply = "I apologize, but I encountered a technical glitch while thinking. Could you please try asking that again? I'm ready to help!"
    } else {
      // Final clean up for the final save
      fullReply = fullReply.replace(/[*#]/g, '')
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
