-- 1. Ensure user_profiles has RLS enabled (we temporarily disabled it earlier)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create an ALL policy to cover SELECT, INSERT, UPDATE, DELETE for UPSERT compatibility on user_profiles
DROP POLICY IF EXISTS "Allow all operations for own profile" ON public.user_profiles;
CREATE POLICY "Allow all operations for own profile" 
ON public.user_profiles 
FOR ALL TO authenticated 
USING ((auth.uid())::text = id)
WITH CHECK ((auth.uid())::text = id);

-- 2. Drop the restrictive INSERT policies on the chat tables because the AI coach trigger needs to run unhindered
DROP POLICY IF EXISTS "individual_insert" ON public.conversations;
DROP POLICY IF EXISTS "individual_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "individual_insert" ON public.messages;

-- Allow authenticated users to insert conversations unhindered
CREATE POLICY "individual_insert" ON public.conversations 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to insert participants
CREATE POLICY "individual_insert" ON public.conversation_participants 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to insert messages
CREATE POLICY "individual_insert" ON public.messages 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- 3. Fix the trigger function to ensure it runs as postgres (which bypasses RLS) 
-- By using SECURITY DEFINER and specifically setting the owner to postgres.
ALTER FUNCTION public.provision_coach_for_new_user() OWNER TO postgres;
ALTER FUNCTION public.provision_coach_for_new_user() SECURITY DEFINER;
ALTER FUNCTION public.provision_coach_for_new_user() SET search_path = public;
