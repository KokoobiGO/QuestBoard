-- Shop System Database Schema
-- This file adds tables for user inventory and shop functionality

-- Create the user_inventory table for purchased items
CREATE TABLE IF NOT EXISTS public.user_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('avatar', 'theme', 'badge')),
    equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Create indexes for user_inventory
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON public.user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_type ON public.user_inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_user_inventory_equipped ON public.user_inventory(equipped);

-- Enable RLS for user_inventory
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for user_inventory
CREATE POLICY "Users can view their own inventory" ON public.user_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory items" ON public.user_inventory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items" ON public.user_inventory
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items" ON public.user_inventory
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;

-- Create a function to ensure only one avatar is equipped at a time
CREATE OR REPLACE FUNCTION ensure_single_equipped_avatar()
RETURNS TRIGGER AS $$
BEGIN
    -- If we're setting an avatar to equipped = true
    IF NEW.item_type = 'avatar' AND NEW.equipped = true THEN
        -- Unequip all other avatars for this user
        UPDATE public.user_inventory 
        SET equipped = false 
        WHERE user_id = NEW.user_id 
        AND item_type = 'avatar' 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to ensure only one avatar is equipped
CREATE TRIGGER ensure_single_equipped_avatar_trigger
    BEFORE INSERT OR UPDATE ON public.user_inventory
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_equipped_avatar();

-- Add default starting coins to new users (optional - can be handled in application)
-- This function can be called when a new user signs up
CREATE OR REPLACE FUNCTION initialize_user_shop_data(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Ensure user has stats record with starting coins
    INSERT INTO public.user_stats (user_id, coins)
    VALUES (user_uuid, 50)
    ON CONFLICT (user_id) 
    DO UPDATE SET coins = GREATEST(user_stats.coins, 50);
END;
$$ language 'plpgsql';