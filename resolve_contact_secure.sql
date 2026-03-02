-- Creates a secure RPC function to resolve a contact by ID or phone number
-- without needing wide-open RLS policies on the chat_users or user_profiles tables.

CREATE OR REPLACE FUNCTION resolve_chat_contact(p_identifier TEXT, p_is_id BOOLEAN DEFAULT false)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    phone_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: runs with owner privileges to bypass RLS for lookups
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_normalized_phone TEXT;
BEGIN
    IF p_is_id THEN
        -- Safely cast to UUID and look up
        BEGIN
            v_user_id := p_identifier::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN; -- Invalid UUID format, return empty block
        END;
    ELSE
        -- Normalize the phone number (strip everything but digits)
        v_normalized_phone := regexp_replace(p_identifier, '\D', '', 'g');
        
        -- Try to find exact match by phone number in chat_users
        SELECT cu.user_id INTO v_user_id
        FROM chat_users cu
        WHERE cu.is_verified = true
        AND (
            regexp_replace(cu.phone_number, '\D', '', 'g') = v_normalized_phone
            OR regexp_replace(cu.country_code || cu.phone_number, '\D', '', 'g') = v_normalized_phone
        )
        LIMIT 1;
    END IF;

    -- If we found a user ID, look up their profile
    IF v_user_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            up.id,
            up.full_name,
            up.avatar_url,
            cu.phone_number
        FROM user_profiles up
        LEFT JOIN chat_users cu ON cu.user_id = up.id AND cu.is_verified = true
        WHERE up.id = v_user_id
        LIMIT 1;
    END IF;
    
    RETURN;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION resolve_chat_contact(TEXT, BOOLEAN) TO authenticated;
