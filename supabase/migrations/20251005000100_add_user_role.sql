-- Add role field to users table for permission management
-- This is separate from 'plan' (subscription tier)
-- role: user (default), support (customer support), admin (senior staff), owner (founder/owner)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin', 'owner'));

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Set existing founder plan users to owner role
UPDATE public.users
SET role = 'owner'
WHERE plan = 'founder';

-- Add comment to clarify the difference
COMMENT ON COLUMN public.users.role IS 'Permission level: user (default), support (customer support team), admin (senior staff with full admin access), owner (founder/owner with full access)';
COMMENT ON COLUMN public.users.plan IS 'Subscription tier: free, pro, founder - determines features and site limits';
