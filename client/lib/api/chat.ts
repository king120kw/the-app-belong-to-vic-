import { supabase } from '../supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const getConversationsV2 = async (userId: string) => {
    console.log(`[API] getConversationsV2 for user: ${userId}`);
    // 1. Provision system conversations if needed (self-chat + Health Coach)
    try {
        const { error: rpcError } = await (supabase as any).rpc('provision_user_system_chats', { p_user_id: userId });
        if (rpcError) console.warn('[API] provision_user_system_chats RPC error:', rpcError);
    } catch (err) {
        console.warn('[API] provision_user_system_chats failed (non-fatal):', err);
    }

    // 2. Get all conversation IDs where the user is a participant
    const { data: participationData, error: participationError } = await (supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, deleted_at')
        .eq('user_id', userId)
        .is('deleted_at', null) as any);

    if (participationError) {
        console.error('[API] Error fetching participation:', participationError);
        throw participationError;
    }

    console.log(`[API] Found ${participationData?.length || 0} participations`);
    if (!participationData || participationData.length === 0) return [];

    const conversationIds = participationData.map(p => p.conversation_id);

    // 2. Fetch the full conversations with participants, profiles, and the DENORMALIZED last message fields
    const { data: rawConvs, error: convError } = await supabase
        .from('conversations')
        .select(`
            *,
            conversation_participants (
                user_id,
                last_read_at,
                user_profiles (
                    full_name, 
                    username,
                    avatar_url
                )
            )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false }) as any;

    if (convError) {
        console.error('[API] Error fetching conversations details:', convError);
        throw convError;
    }

    // 4. Process and calc unread counts locally
    const processed = rawConvs?.map((conv: any) => {
        const participantInfo = conv.conversation_participants?.find((p: any) => p.user_id === userId);
        const lastRead = participantInfo?.last_read_at ? new Date(participantInfo.last_read_at) : new Date(0);

        // V9: Use denormalized fields for lightning fast previews
        const lastMsg = conv.last_message_content ? {
            content: conv.last_message_content,
            message_type: conv.last_message_type || 'text',
            sender_id: conv.last_message_sender_id,
            created_at: conv.last_message_at
        } : null;

        // Note: For unread_count at scale, we'd use a dedicated column, but for now we look at the last_message_at vs lastRead
        // We assume 1 unread if last_message_at > lastRead AND sender != userId
        const unread_count = (lastMsg && lastMsg.sender_id !== userId && new Date(lastMsg.created_at) > lastRead) ? 1 : 0;

        // Process display info
        const COACH_ID = '00000000-0000-0000-0000-000000000001';
        let display_name = 'Unknown';
        let display_avatar: string | null = null;
        let display_phone = null;

        if (conv.conversation_type === 'self') {
            const profileArray = participantInfo?.user_profiles;
            const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray;
            display_name = profile?.full_name ? `${profile.full_name} (Me)` : 'Personal Notes';
            display_avatar = profile?.avatar_url || null;
            display_phone = profile?.chat_users?.phone_number || null;
        } else if (conv.conversation_type === 'ai') {
            display_name = 'Health Coach';
            display_avatar = '/APP%20LOGO.jpg';
        } else {
            const otherParticipant = conv.conversation_participants?.find((p: any) => p.user_id !== userId);
            const profileArray = otherParticipant?.user_profiles;
            const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray;

            display_name = profile?.full_name || profile?.username || conv.name || 'User';
            display_avatar = profile?.avatar_url || null;
        }

        return {
            ...conv,
            display_name,
            display_avatar,
            display_phone,
            last_message: lastMsg,
            unread_count
        };
    }) || [];

    return processed;
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
                    username,
                    avatar_url,
                    chat_users(phone_number, is_verified)
                )
            )
        `)
        .eq('id', conversationId)
        .maybeSingle() as any);

    if (error) throw error;
    if (!data) return null;

    // Process display info using strict identity detection
    const COACH_ID = '00000000-0000-0000-0000-000000000001';

    if (data.conversation_type === 'self') {
        const participant = data.conversation_participants.find((p: any) => p.user_id === userId);
        const rawProfile = participant?.user_profiles;
        const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

        data.display_name = profile?.full_name ? `${profile.full_name} (Me)` : 'Personal Notes';
        data.display_avatar = profile?.avatar_url;
        data.display_phone = (Array.isArray(profile?.chat_users) ? profile.chat_users[0]?.phone_number : profile?.chat_users?.phone_number) || null;
    } else if (data.conversation_type === 'ai') {
        data.display_name = 'Health Coach';
        data.display_avatar = '/APP%20LOGO.jpg';
        data.display_phone = null;
    } else {
        const otherParticipant = data.conversation_participants.find((p: any) => p.user_id !== userId && p.user_id !== COACH_ID);
        if (otherParticipant) {
            const rawProfile = otherParticipant.user_profiles;
            const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
            const chatUser = Array.isArray(profile?.chat_users) ? profile.chat_users[0] : profile?.chat_users;

            data.display_name = profile?.full_name || profile?.username || data.name || chatUser?.phone_number || 'User';
            data.display_avatar = profile?.avatar_url;
            data.display_phone = chatUser?.phone_number;
        } else {
            data.display_name = data.name || 'User';
            data.display_avatar = null;
        }
    }

    return data;
}

export const addContactPure = async (userId: string, contactUserId: string) => {
    const { error } = await (supabase as any).rpc('add_contact_pure', {
        p_user_id: userId,
        p_contact_id: contactUserId
    });
    if (error) throw error;
}

export const provisionAndSendMessage = async (
    senderId: string,
    receiverId: string,
    content: string,
    messageType: string = 'text',
    metadata: any = {}
) => {
    console.log(`[API] provisionAndSendMessage: ${senderId} -> ${receiverId}`);
    const { data: convId, error } = await (supabase as any).rpc('provision_and_send_message', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_content: content,
        p_message_type: messageType,
        p_metadata: metadata
    });

    if (error) {
        console.error('[API] provision_and_send_message RPC error:', error);
        throw error;
    }
    console.log(`[API] provisionAndSendMessage success. ConvId: ${convId}`);
    return convId; // Returns the UUID of the conversation (new or existing)
}

export const createPrivateConversation = async (userId: string, otherUserId: string) => {
    // NOTE: In V6, we prefer interaction-driven creation via provisionAndSendMessage.
    // This function is kept for backward compatibility but should be avoided if possible.
    const { data: convId, error } = await (supabase as any).rpc('provision_and_send_message', {
        p_sender_id: userId,
        p_receiver_id: otherUserId,
        p_content: 'Conversation started',
        p_message_type: 'system'
    });

    if (error) throw error;
    return { id: convId };
}

export const findConversationByParticipants = async (user1Id: string, user2Id: string) => {
    const { data, error } = await (supabase as any).rpc('find_conversation_by_participants', {
        p_user1: user1Id,
        p_user2: user2Id
    });

    if (error) {
        console.error('[API] Error finding conversation:', error);
        return null;
    }

    return data && data[0] ? data[0].id : null;
}

export const getContacts = async (userId: string) => {
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            contact_user_id,
            user_profiles:contact_user_id(
                full_name,
                username,
                avatar_url,
                chat_users(phone_number, is_verified)
            )
        `)
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching contacts:', error);
        return [];
    }

    return data.map((c: any) => {
        const rawProfile = c.user_profiles;
        const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
        const chatUserArray = profile?.chat_users;
        const chatUser = Array.isArray(chatUserArray) ? chatUserArray[0] : chatUserArray;

        return {
            id: c.contact_user_id,
            full_name: profile?.full_name || profile?.username || chatUser?.phone_number || 'Unknown',
            avatar_url: profile?.avatar_url,
            phone_number: chatUser?.phone_number,
            is_verified: !!chatUser?.is_verified
        };
    }).filter(c => c.is_verified); // ONLY show verified contacts as per requirement
}

export const getMyQRCodeData = async (userId: string) => {
    // Get phone and username for the QR payload
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

    const { data: chatUser } = await supabase
        .from('chat_users')
        .select('phone_number')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    return JSON.stringify({
        userId,
        username: (profile as any)?.username,
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
            metadata: {
                ...metadata,
                timestamp: now
            },
            is_delivered: true, // Optimistically delivered
            delivered_at: now,
            read_at: (isAI || isSelf) ? now : null,
            is_read: (isAI || isSelf)
        })
        .select()
        .single()

    if (error) throw error

    // Update conversation last_message_at (Migration trigger handles this too, but for speed:)
    supabase.from('conversations')
        .update({ last_message_at: now } as any)
        .eq('id', conversationId)
        .then();

    if (isAI) {
        // Explicitly trigger the coach reply function if this is an AI chat
        const systemContext = {
            current_time: new Date().toISOString(),
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            location_hint: metadata?.location_hint,
            latest_analysis: metadata?.latest_analysis || metadata?.analysisContext
        };

        const invokeWithRetry = async (retryCount = 0) => {
            try {
                const { error: invokeErr } = await supabase.functions.invoke('coach-reply', {
                    body: {
                        type: 'INSERT',
                        table: 'messages',
                        record: data,
                        system_context: systemContext
                    }
                });
                if (invokeErr) throw invokeErr;
            } catch (err) {
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 1000;
                    console.warn(`Coach reply failed, retrying in ${delay}ms... (Attempt ${retryCount + 1})`);
                    setTimeout(() => invokeWithRetry(retryCount + 1), delay);
                } else {
                    console.error("Coach reply failed after maximum retries:", err);
                }
            }
        };

        invokeWithRetry().catch(err => console.error("Initial coach trigger failed:", err));
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

    // Also mark individual messages as read (inc. is_read flag per spec)
    // ONLY update messages NOT sent by the current user
    await supabase
        .from('messages')
        .update({
            is_read: true,
            read_at: lastReadAt
        } as any)
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

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

// --- Typing Indicator ---
// V12: We prefer Presence (track) on the main room channel for robust "is typing" status.
// Use this only if you need a separate broadcast event for some reason.
export const sendTypingIndicator = async (channel: RealtimeChannel, userId: string, conversationId: string, isTyping: boolean) => {
    return channel.track({
        user_id: userId,
        conversation_id: conversationId,
        typing: isTyping,
        online_at: new Date().toISOString()
    });
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
    const roomUrl = roomData?.room_url;

    if (!roomUrl) {
        throw new Error('Room URL missing from RPC response');
    }

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

export const findUserByIdentifier = async (identifier: string) => {
    if (!identifier || identifier.trim().length === 0) return null;

    const { data, error } = await supabase.rpc('find_user_by_identifier', {
        p_identifier: identifier.trim()
    });

    if (error) {
        console.error("findUserByIdentifier RPC error:", error);
        throw error;
    }

    return (data && data.length > 0) ? data[0] : null;
}

export const findUserByPhone = async (phoneNumber: string) => {
    return findUserByIdentifier(phoneNumber);
}

export const findUserByUsername = async (username: string) => {
    return findUserByIdentifier(username);
}

export const findUserByIdSecure = async (id: string | null) => {
    if (!id) return null;
    const { data, error } = await supabase.rpc('find_user_by_identifier', {
        p_identifier: id
    });

    if (error) {
        console.error('findUserByIdSecure RPC error:', error);
        return null;
    }

    return (data && data.length > 0) ? data[0] : null;
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
