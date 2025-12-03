import { supabase } from '../supabase'

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const getNotifications = async (limit = 50) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data
}

export const getUnreadNotifications = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export const markNotificationAsRead = async (notificationId: string) => {
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
}

export const markAllNotificationsAsRead = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.data.user.id)
        .eq('is_read', false)
}

export const createNotification = async (
    userId: string,
    type: 'alert' | 'update' | 'verse' | 'hadith' | 'reminder',
    title: string,
    content: string,
    actionUrl?: string
) => {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            notification_type: type,
            title,
            content,
            action_url: actionUrl,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

// ============================================================================
// SETTINGS
// ============================================================================

export const getUserSettings = async () => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.data.user.id)
        .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
}

export const updateSettings = async (settings: Partial<{
    theme: 'light' | 'dark'
    push_notifications_enabled: boolean
    language: string
    currency: string
    timezone: string
}>) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: user.data.user.id,
            ...settings,
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const updateTheme = async (theme: 'light' | 'dark') => {
    return updateSettings({ theme })
}

export const togglePushNotifications = async (enabled: boolean) => {
    return updateSettings({ push_notifications_enabled: enabled })
}

export const updateLanguage = async (language: string) => {
    return updateSettings({ language })
}

export const updateCurrency = async (currency: string) => {
    return updateSettings({ currency })
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export const getSubscriptionStatus = async () => {
    const settings = await getUserSettings()
    return {
        status: settings?.subscription_status || 'free',
        expiresAt: settings?.subscription_expires_at,
    }
}

export const updateSubscription = async (
    status: 'free' | 'premium',
    expiresAt?: string
) => {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
        .from('user_settings')
        .update({
            subscription_status: status,
            subscription_expires_at: expiresAt,
        })
        .eq('user_id', user.data.user.id)
        .select()
        .single()

    if (error) throw error
    return data
}
