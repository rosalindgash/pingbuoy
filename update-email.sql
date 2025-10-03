-- Update auth email to rosalind@pingbuoy.com
-- Run this in Supabase SQL Editor

-- First, let's see the current user
SELECT id, email FROM auth.users WHERE email LIKE '%rrgash%' OR email LIKE '%rosalind%';

-- Update the auth.users table (uncomment after verifying the user ID)
-- UPDATE auth.users 
-- SET email = 'rosalind@pingbuoy.com', 
--     raw_user_meta_data = jsonb_set(
--       COALESCE(raw_user_meta_data, '{}'::jsonb), 
--       '{email}', 
--       '"rosalind@pingbuoy.com"'
--     )
-- WHERE email = 'rrgash@protonmail.com';

-- Update the public.users table to match
-- UPDATE public.users 
-- SET email = 'rosalind@pingbuoy.com' 
-- WHERE email = 'rrgash@protonmail.com' OR email = 'rosalind@pingbuoy.com';
