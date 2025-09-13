-- Add full_name column to users table
-- Run this in your Supabase SQL editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add founder plan support
-- Run this migration to allow founder plan type

-- First drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;

-- Add the new constraint that includes founder
ALTER TABLE public.users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'pro', 'founder'));