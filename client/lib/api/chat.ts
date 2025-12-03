import { supabase } from '../supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const getConversations = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
      conversation_id,
      joined_at,
      last_read_at,
      conversations (
        id,
        conversation_type,
        name,
        avatar_url,
        created_at
      )
    `)
        .eq('user_id', user.data.user.id)
        .order('joined_at', { ascending: false })

    if (error) throw error
    return data
}

export const createPrivateConversation = async (otherUserId: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Create conversation
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
            conversation_type: 'private',
            created_by: user.data.user.id,
        })
        .select()
        .single()

    if (convError) throw convError

    // Add participants
    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
            { conversation_id: conversation.id, user_id: user.data.user.id },
            { conversation_id: conversation.id, user_id: otherUserId },
        ])

    if (partError) throw partError
    return conversation
}

export const createGroupConversation = async (name: string, participantIds: string[]) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
            conversation_type: 'group',
            name,
            created_by: user.data.user.id,
        })
        .select()
        .single()

    if (convError) throw convError

    // Add participants including creator
    const participants = [user.data.user.id, ...participantIds].map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
    }))

    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants)

    if (partError) throw partError
    return conversation
}

// ============================================================================
// MESSAGES
// ============================================================================

export const getMessages = async (conversationId: string, limit = 50) => {
    const { data, error } = await supabase
        .from('messages')
        .select(`
      *,
      sender:sender_id (
        id,
        full_name,
        avatar_url
      )
    `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data.reverse() // Return in chronological order
}

export const sendMessage = async (
    conversationId: string,
    content: string,
    messageType: 'text' | 'voice' | 'video' | 'image' | 'file' | 'link' = 'text',
    metadata?: any
) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.data.user.id,
            message_type: messageType,
            content,
            metadata,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const uploadChatMedia = async (file: File, conversationId: string): Promise<string> => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `${conversationId}/${user.data.user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName)

    return publicUrl
}

export const markAsRead = async (conversationId: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.data.user.id)
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export const subscribeToMessages = (
    conversationId: string,
    callback: (message: any) => void
): RealtimeChannel => {
    const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => callback(payload.new)
        )
        .subscribe()

    return channel
}

export const unsubscribeFromMessages = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel)
}

// ============================================================================
// TYPING INDICATORS
// ============================================================================

export const sendTypingIndicator = async (conversationId: string) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    // Broadcast typing status via Realtime
    const channel = supabase.channel(`typing:${conversationId}`)
    await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.data.user.id, isTyping: true },
    })
}

// ============================================================================
// CALLS
// ============================================================================

export const initiateCall = async (
    conversationId: string,
    callType: 'voice' | 'video'
) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('call_history')
        .insert({
            conversation_id: conversationId,
            caller_id: user.data.user.id,
            call_type: callType,
            status: 'initiated',
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const endCall = async (callId: string, duration: number) => {
    await supabase
        .from('call_history')
        .update({
            status: 'completed',
            duration,
            ended_at: new Date().toISOString(),
        })
        .eq('id', callId)
}
