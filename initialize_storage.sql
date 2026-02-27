-- Create the user-avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the user-avatars bucket
-- Allow public read access to all avatars
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "User Upload" ON storage.objects;
CREATE POLICY "User Upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "User Update" ON storage.objects;
CREATE POLICY "User Update" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'user-avatars' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatar
DROP POLICY IF EXISTS "User Delete" ON storage.objects;
CREATE POLICY "User Delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'user-avatars' 
    AND (auth.uid())::text = (storage.foldername(name))[1]
);
