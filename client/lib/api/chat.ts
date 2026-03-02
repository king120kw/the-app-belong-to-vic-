import { supabase } from '../supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const getConversationsV2 = async (userId: string) => {
    // 1. First get all conversation IDs where the user is a participant
    const { data: participationData, error: participationError } = await (supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, deleted_at')
        .eq('user_id', userId)
        .is('deleted_at', null) as any);

    if (participationError) {
        console.error('Error fetching participation:', participationError);
        throw participationError;
    }

    // 2. Provision system conversations (self-chat + Health Coach) via secure DB function
    //    This uses SECURITY DEFINER so it bypasses RLS - no 403 errors
    try {
        await (supabase as any).rpc('provision_user_system_chats', { p_user_id: userId });
    } catch (err) {
        console.warn('provision_user_system_chats failed (non-fatal):', err);
    }

    // 3. Re-fetch participation data (includes newly created system convs)
    const { data: freshParticipation } = await (supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, deleted_at')
        .eq('user_id', userId)
        .is('deleted_at', null) as any);

    const updatedParticipation = freshParticipation || participationData || [];

    if (updatedParticipation.length === 0) return [];

    const conversationIds = updatedParticipation.map(p => p.conversation_id);

    // 2. Fetch the full conversations with ALL participants and messages
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            *,
            conversation_participants (
                user_id,
                user_profiles (
                    full_name, 
                    avatar_url,
                    chat_users(phone_number, is_verified)
                )
            ),
            messages (
                content,
                message_type,
                created_at,
                sender_id,
                read_at,
                delivered_at
            )
        `)
        .in('id', conversationIds) as any;

    if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }

    // 3. Process to get the ACTUAL last message, unread count, and display info
    const processed = data?.map((conv: any) => {
        // Sort messages manually
        const sortedMsgs = (conv.messages || []).sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Calculate unread count using last_read_at from participationData
        const participantInfo = participationData.find(p => p.conversation_id === conv.id);
        const lastRead = participantInfo?.last_read_at ? new Date(participantInfo.last_read_at) : new Date(0);

        const unread_count = sortedMsgs.filter((msg: any) =>
            msg.sender_id !== userId && new Date(msg.created_at) > lastRead
        ).length;

        // Process display info - use conversation_type for strict identity separation
        const COACH_ID = '00000000-0000-0000-0000-000000000001';
        let display_name = 'Unknown';
        let display_avatar: string | null = null;
        let display_phone = null;

        if (conv.conversation_type === 'self') {
            // Self-chat: use the user's own profile
            const myParticipant = conv.conversation_participants?.find((p: any) => p.user_id === userId);
            const myProfile = myParticipant?.user_profiles;
            display_name = myProfile?.full_name ? `${myProfile.full_name} (Me)` : 'Personal Notes';
            display_avatar = myProfile?.avatar_url || null;
            display_phone = myProfile?.chat_users?.phone_number || null;
        } else if (conv.conversation_type === 'ai') {
            // Health Coach: always use fixed identity
            display_name = 'Health Coach';
            display_avatar = '/APP%20LOGO.jpg';
            display_phone = null;
        } else {
            // Peer conversation: find the OTHER participant
            const otherParticipant = conv.conversation_participants?.find((p: any) => p.user_id !== userId);
            if (otherParticipant) {
                const profile = otherParticipant.user_profiles;
                const chatUser = profile?.chat_users;
                display_name = profile?.full_name || chatUser?.phone_number || 'User';
                display_avatar = profile?.avatar_url || null;
                display_phone = chatUser?.phone_number || null;
            }
        }

        return {
            ...conv,
            display_name,
            display_avatar,
            display_phone,
            last_message: sortedMsgs[0] || null,
            unread_count
        };
    }) || [];

    // Sort conversations by last message timestamp
    return processed.sort((a: any, b: any) => {
        const timeA = new Date(a.last_message?.created_at || a.created_at).getTime();
        const timeB = new Date(b.last_message?.created_at || b.created_at).getTime();
        return timeB - timeA;
    });
}

export const getConversationById = async (conversationId: string, userId: string) => {
    const { data, error } = await (supabase
        .from('conversations')
        .select(`
            *,
            conversation_participants(
                user_id,
                user_profiles(
                    full_name, 
                    avatar_url,
                    chat_users(phone_number, is_verified)
                )
            )
        `)
        .eq('id', conversationId)
        .single() as any);

    if (error) throw error;

    // Process display info using strict identity detection
    const COACH_ID = '00000000-0000-0000-0000-000000000001';

    if (data.conversation_type === 'self') {
        const myProfile = data.conversation_participants.find((p: any) => p.user_id === userId)?.user_profiles;
        data.display_name = myProfile?.full_name ? `${myProfile.full_name} (Me)` : 'Personal Notes';
        data.display_avatar = myProfile?.avatar_url;
        data.display_phone = myProfile?.chat_users?.phone_number;
    } else if (data.conversation_type === 'ai') {
        data.display_name = 'Health Coach';
        data.display_avatar = '/APP%20LOGO.jpg';
        data.display_phone = null;
    } else {
        const otherParticipant = data.conversation_participants.find((p: any) => p.user_id !== userId && p.user_id !== COACH_ID);
        if (otherParticipant) {
            const profile = otherParticipant.user_profiles;
            const chatUser = profile?.chat_users;
            data.display_name = profile?.full_name || chatUser?.phone_number || 'User';
            data.display_avatar = profile?.avatar_url;
            data.display_phone = chatUser?.phone_number;
        } else {
            // Fallback
            data.display_name = 'User';
            data.display_avatar = null;
        }
    }

    return data;
}

export const createPrivateConversation = async (userId: string, otherUserId: string) => {
    // We now use a single secure RPC call to get or create the conversation.
    // This avoids RLS issues and multiple round-trips.
    const { data: convId, error } = await supabase.rpc('get_or_create_conversation', {
        p_user_id: userId,
        p_other_id: otherUserId
    });

    if (error) {
        console.error('Error in get_or_create_conversation:', error);
        throw error;
    }

    if (!convId) throw new Error('Failed to retrieve or create conversation ID');

    return { id: convId };
}

export const getMyQRCodeData = async (userId: string) => {
    const { data: chatUser } = await supabase
        .from('chat_users')
        .select('phone_number')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    return JSON.stringify({
        userId,
        phone: chatUser?.phone_number
    });
}

export const createGroupConversation = async (userId: string, name: string, participantIds: string[]) => {
    // 1. Create conversation record
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
            is_group: true,
            name,
            conversation_type: 'group'
        } as any)
        .select()
        .single()

    if (convError) throw convError

    // 2. Add participants
    const participants = [userId, ...participantIds].map(id => ({
        conversation_id: conv.id,
        user_id: id
    }))

    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants)

    if (partError) throw partError

    return conv
}

// ============================================================================
// MESSAGES
// ============================================================================

export const getMessages = async (conversationId: string, limit = 50) => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data.reverse() // Return in chronological order
}

export const sendMessage = async (
    userId: string,
    conversationId: string,
    content: string,
    messageType: 'text' | 'voice' | 'video' | 'image' | 'file' | 'link' = 'text',
    metadata?: any,
    isAI?: boolean,
    isSelf?: boolean
) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: userId,
            message_type: messageType,
            content,
            metadata,
            read_at: (isAI || isSelf) ? now : null
        })
        .select()
        .single()

    if (error) throw error

    if (isAI) {
        // Explicitly trigger the coach reply function if this is an AI chat
        supabase.functions.invoke('coach-reply', {
            body: {
                type: 'INSERT',
                table: 'messages',
                record: data
            }
        }).catch(err => console.error("Coach reply trigger failed:", err));
    }

    return data
}

export const uploadChatMedia = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `chat/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

    return publicUrl
}

// Mark messages as read for a specific conversation
export const markAsRead = async (userId: string, conversationId: string, timestamp?: string) => {
    const lastReadAt = timestamp || new Date().toISOString();

    const { error } = await supabase
        .from('conversation_participants')
        .update({
            last_read_at: lastReadAt
        } as any)
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);

    if (error) {
        console.error('[API] Error marking as read:', error);
        return false;
    }

    // Also mark individual messages as read
    await supabase
        .from('messages')
        .update({ read_at: lastReadAt } as any)
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null)
        .lt('created_at', lastReadAt);

    return true;
};

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

export const subscribeToUserConversations = (
    userId: string,
    callback: (payload: any) => void
): RealtimeChannel => {
    const channel = supabase
        .channel(`user-convos:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'conversation_participants',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => callback(payload)
        )
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to INSERT (new msg) and UPDATE (mark as read)
                schema: 'public',
                table: 'messages',
            },
            async (payload: any) => {
                if (payload.new) {
                    // Database trigger handles restoration of deleted conversations
                    callback(payload);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'calls',
                filter: `receiver_id=eq.${userId}`,
            },
            (payload) => callback({ ...payload, table: 'calls' })
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

export const sendTypingIndicator = async (userId: string, conversationId: string, isTyping: boolean) => {
    await supabase.channel(`conversation:${conversationId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: userId, isTyping }
    })
}

// ============================================================================
// CALLS (Daily.co Logic)
// ============================================================================

export const initiateCallV2 = async (conversationId: string, callerId: string, receiverId: string, type: 'voice' | 'video') => {
    console.log(`[Call] Initiating ${type} call... Conv: ${conversationId}, Caller: ${callerId}, Receiver: ${receiverId}`);

    // 1. Create a real room via Postgres RPC
    const { data: roomData, error: roomError } = await supabase.rpc('create_daily_room_rpc', {
        conversation_id: conversationId
    });

    if (roomError) {
        console.error('[Call] Failed to create room via RPC:', roomError);
        throw new Error('Failed to start call: Room creation failed (' + roomError.message + ')');
    }

    console.log('[Call] Room created successfully:', roomData);
    const roomUrl = roomData.room_url;

    // 2. Insert call record
    const { data, error } = await supabase
        .from('calls')
        .insert({
            conversation_id: conversationId,
            caller_id: callerId,
            receiver_id: receiverId,
            room_url: roomUrl,
            type: type,
            status: 'ringing'
        })
        .select(`
            *,
            caller:user_profiles!caller_id(full_name, avatar_url),
            receiver:user_profiles!receiver_id(full_name, avatar_url)
        `)
        .single();

    if (error) {
        console.error('[Call] Failed to insert call record:', error);
        throw error;
    }

    console.log('[Call] Call record inserted:', data);
    return data;
}

export const updateCallStatus = async (callId: string, status: 'connected' | 'ended' | 'missed' | 'declined') => {
    const update: any = { status };
    if (status === 'ended') update.ended_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('calls')
        .update(update)
        .eq('id', callId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================================
// VERIFICATION & SEARCH
// ============================================================================

export const isChatVerified = async (userId: string) => {
    const { data, error } = await supabase
        .from('chat_users')
        .select('is_verified')
        .eq('user_id', userId)

    if (error) {
        console.error("isChatVerified failed with error:", error);
        return false;
    }

    if (!data || data.length === 0) return false;

    // If ANY of the rows for this user is verified, they are verified
    return data.some((row: any) => row.is_verified)
}

export const findUserByPhone = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.trim().length < 7) {
        console.warn("[API] findUserByPhone called with invalid number:", phoneNumber);
        return null;
    }
    // We now use the secure RPC to bypass RLS and retrieve the contact instantly
    const { data, error } = await supabase.rpc('resolve_chat_contact', {
        p_identifier: phoneNumber.trim(),
        p_is_id: false
    });

    if (error) {
        console.error("findUserByPhone RPC error:", error);
        throw error;
    }

    const row = data && data.length > 0 ? data[0] : null;
    if (!row) return null;

    // Map RPC result back to standard naming
    return {
        id: row.r_id,
        full_name: row.r_full_name,
        avatar_url: row.r_avatar_url,
        phone_number: row.r_phone_number
    };
}

export const findUserByIdSecure = async (id: string | null) => {
    if (!id) return null;
    const { data, error } = await supabase.rpc('resolve_chat_contact', {
        p_identifier: id,
        p_is_id: true
    });

    if (error) {
        console.error('findUserByIdSecure RPC error:', error);
        return null;
    }

    const row = data && data.length > 0 ? data[0] : null;
    if (!row) return null;

    return {
        id: row.r_id,
        full_name: row.r_full_name,
        avatar_url: row.r_avatar_url,
        phone_number: row.r_phone_number
    };
}

// ============================================================================
// MANAGEMENT
// ============================================================================

export const softDeleteConversation = async (conversationId: string, userId: string) => {
    const { error } = await supabase
        .from('conversation_participants')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

    if (error) throw error;
}

export const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

    if (error) throw error;
}

export const clearMessages = async (conversationId: string) => {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

    if (error) throw error;
}
