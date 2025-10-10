-- Migration to add equipped_avatar field to existing user_stats table
-- Run this if you already have the user_stats table created

-- Add the equipped_avatar column to user_stats table
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS equipped_avatar VARCHAR(100);

-- Optional: Set default starting coins for existing users who might have 0 coins
UPDATE public.user_stats 
SET coins = 50 
WHERE coins = 0;