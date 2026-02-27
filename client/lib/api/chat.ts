import { supabase } from '../supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const getConversationsV2 = async (userId: string) => {
    // 1. First get all conversation IDs where the user is a participant (and not soft-deleted)
    const { data: participationData, error: participationError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, deleted_at')
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (participationError) {
        console.error('Error fetching participation:', participationError);
        throw participationError;
    }

    const COACH_ID = '00000000-0000-0000-0000-000000000001';

    // Ensure Health Coach conversation exists for this user
    let updatedParticipation = participationData || [];

    // Check if we already have a conversation with the Health Coach in our list
    // We need to check participants of all current conversations
    let hasCoachConversation = false;

    if (updatedParticipation.length > 0) {
        const { data: coachChecks } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .in('conversation_id', updatedParticipation.map(p => p.conversation_id))
            .eq('user_id', COACH_ID);

        if (coachChecks && coachChecks.length > 0) {
            hasCoachConversation = true;
        }
    }

    if (!hasCoachConversation) {
        try {
            const conv = await createPrivateConversation(userId, COACH_ID);
            // Refresh participation data
            const { data: newParticipation } = await supabase
                .from('conversation_participants')
                .select('conversation_id, last_read_at, deleted_at')
                .eq('user_id', userId)
                .eq('conversation_id', conv.id)
                .is('deleted_at', null)
                .single();

            if (newParticipation) {
                updatedParticipation = [...updatedParticipation, newParticipation];
            }
        } catch (err) {
            console.error("Failed to auto-provision Health Coach:", err);
        }
    }

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
                    chat_users!chat_users_user_id_fkey(phone_number, is_verified)
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

        // Process display info
        const otherParticipant = conv.conversation_participants?.find((p: any) => p.user_id !== userId);
        let display_name = 'Expert';
        let display_avatar = null;
        let display_phone = null;

        if (otherParticipant) {
            const profile = otherParticipant.user_profiles;
            const chatUser = profile?.chat_users;
            display_name = profile?.full_name || chatUser?.phone_number || 'Expert';
            display_avatar = profile?.avatar_url;
            display_phone = chatUser?.phone_number;
        } else if (conv.conversation_participants && conv.conversation_participants.length > 0) {
            // Self chat (only me as participant)
            const myProfile = conv.conversation_participants[0]?.user_profiles;
            display_name = myProfile?.full_name ? `${myProfile.full_name} (You)` : 'Expert';
            display_avatar = myProfile?.avatar_url;
            display_phone = myProfile?.chat_users?.phone_number;
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
                user_profiles!fk_conversation_participants_user_profiles(
                    full_name, 
                    avatar_url,
                    chat_users!chat_users_user_id_fkey(phone_number, is_verified)
                )
            )
        `)
        .eq('id', conversationId)
        .single() as any);

    if (error) throw error;

    // Process display info
    const otherParticipant = data.conversation_participants.find((p: any) => p.user_id !== userId);
    if (otherParticipant) {
        const profile = otherParticipant.user_profiles;
        const chatUser = profile?.chat_users;
        data.display_name = profile?.full_name || chatUser?.phone_number || 'Expert';
        data.display_avatar = profile?.avatar_url;
        data.display_phone = chatUser?.phone_number;
    } else {
        const myProfile = data.conversation_participants[0]?.user_profiles;
        data.display_name = myProfile?.full_name ? `${myProfile.full_name} (You)` : 'Expert';
        data.display_avatar = myProfile?.avatar_url;
        data.display_phone = myProfile?.chat_users?.phone_number;
    }

    return data;
}

export const createPrivateConversation = async (userId: string, otherUserId: string) => {
    // 1. Check if a private conversation already exists between these two users
    const isSelf = userId === otherUserId;

    const { data: existing, error: searchError } = await (supabase
        .from('conversations')
        .select(`
            id,
            conversation_participants(user_id)
        `)
        .eq('is_group', false) as any);

    if (searchError) {
        console.error('Error searching for existing conversation:', searchError);
    } else if (existing) {
        for (const conv of existing) {
            const parts = conv.conversation_participants;
            if (isSelf) {
                // For self chat, we look for a conversation with 1 or 2 participants, all being me
                if (parts.length > 0 && parts.every((p: any) => p.user_id === userId)) {
                    return conv;
                }
            } else {
                // For regular chat, we look for both participants
                const hasMe = parts.some((p: any) => p.user_id === userId);
                const hasOther = parts.some((p: any) => p.user_id === otherUserId);
                if (hasMe && hasOther && parts.length === 2 && userId !== otherUserId) {
                    return conv;
                }
            }
        }
    }

    // 2. Create conversation record if not found
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
            is_group: false
        } as any)
        .select()
        .single()

    if (convError) throw convError

    // 3. Add participants
    const participants = isSelf
        ? [{ conversation_id: conv.id, user_id: userId }]
        : [
            { conversation_id: conv.id, user_id: userId },
            { conversation_id: conv.id, user_id: otherUserId }
        ];

    const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants)

    if (partError) throw partError

    return conv
}

export const createGroupConversation = async (userId: string, name: string, participantIds: string[]) => {
    // 1. Create conversation record
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
            is_group: true,
            name
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
    metadata?: any
) => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: userId,
            message_type: messageType,
            content,
            metadata,
        })
        .select()
        .single()

    if (error) throw error
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
        .maybeSingle()

    if (error || !data) return false
    return data.is_verified
}

export const findUserByPhone = async (phoneNumber: string) => {
    // 1. Normalize input (remove +, spaces, etc)
    const normalized = phoneNumber.replace(/\D/g, '');

    // 2. Query chat_users. We check for variations:
    // a. Exact match with phone_number
    // b. Match with country_code + phone_number
    const { data: matches, error: chatError } = await (supabase
        .from('chat_users')
        .select('user_id, phone_number, country_code')
        .eq('is_verified', true) as any);

    if (chatError) throw chatError;

    // Filter in JS to handle concatenation comparison easily and robustly
    const target = matches?.find((cu: any) => {
        const full = (cu.country_code + cu.phone_number).replace(/\D/g, '');
        const local = cu.phone_number.replace(/\D/g, '');
        return full === normalized || local === normalized || normalized.endsWith(local);
    });

    if (!target) return null;

    // 3. Return the profile
    const { data: profile, error: profError } = await (supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url, chat_users!chat_users_user_id_fkey(phone_number)')
        .eq('id', target.user_id)
        .single() as any);

    if (profError) throw profError;

    // Attach phone to top level for convenience
    if (profile && profile.chat_users) {
        profile.phone_number = profile.chat_users.phone_number;
    }

    return profile;
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
