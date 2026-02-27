import { supabase } from '../supabase';

// ============================================================================
// CONTACTS
// ============================================================================

export const getContacts = async (userId: string) => {
    const { data, error } = await supabase
        .from('contacts')
        .select(`
            *,
            contact:contact_user_id(
                id,
                full_name,
                avatar_url,
                bio
            )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const addContact = async (userId: string, contactUserId: string) => {
    // Check if contact already exists
    const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('contact_user_id', contactUserId)
        .single();

    if (existing) {
        throw new Error('Contact already exists');
    }

    // Create contact
    const { data, error } = await supabase
        .from('contacts')
        .insert({
            user_id: userId,
            contact_user_id: contactUserId,
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const removeContact = async (userId: string, contactUserId: string) => {
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', userId)
        .eq('contact_user_id', contactUserId);

    if (error) throw error;
};

// ============================================================================
// CONTACT REQUESTS
// ============================================================================

export const getContactRequests = async (userId: string) => {
    const { data, error } = await supabase
        .from('contact_requests')
        .select(`
            *,
            from_user:from_user_id(
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createContactRequest = async (fromUserId: string, toUserId: string) => {
    const { data, error } = await supabase
        .from('contact_requests')
        .insert({
            from_user_id: fromUserId,
            to_user_id: toUserId,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const acceptContactRequest = async (requestId: string, userId: string, fromUserId: string) => {
    // Update request status
    const { error: updateError } = await supabase
        .from('contact_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (updateError) throw updateError;

    // Create bidirectional contacts
    const { error: contact1Error } = await supabase
        .from('contacts')
        .insert({
            user_id: userId,
            contact_user_id: fromUserId,
            status: 'active'
        });

    if (contact1Error) throw contact1Error;

    const { error: contact2Error } = await supabase
        .from('contacts')
        .insert({
            user_id: fromUserId,
            contact_user_id: userId,
            status: 'active'
        });

    if (contact2Error) throw contact2Error;
};

export const declineContactRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('contact_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

    if (error) throw error;
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export const subscribeToContactRequests = (userId: string, callback: (payload: any) => void) => {
    return supabase
        .channel('contact-requests')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'contact_requests',
                filter: `to_user_id=eq.${userId}`
            },
            callback
        )
        .subscribe();
};
