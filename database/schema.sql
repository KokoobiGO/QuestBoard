-- Create the quests table
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'one_time')),
    due_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE
);

-- Create the user_stats table for XP and coins
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    xp INTEGER DEFAULT 0 NOT NULL,
    coins INTEGER DEFAULT 0 NOT NULL,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_activity_date DATE,
    equipped_avatar VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON public.quests(user_id);

-- Create an index on due_date for sorting
CREATE INDEX IF NOT EXISTS idx_quests_due_date ON public.quests(due_date);

-- Create an index on user_stats user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own quests
CREATE POLICY "Users can view their own quests" ON public.quests
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own quests
CREATE POLICY "Users can insert their own quests" ON public.quests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own quests
CREATE POLICY "Users can update their own quests" ON public.quests
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own quests
CREATE POLICY "Users can delete their own quests" ON public.quests
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_stats table
CREATE POLICY "Users can view their own stats" ON public.user_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON public.user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for quests
CREATE TRIGGER update_quests_updated_at
    BEFORE UPDATE ON public.quests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for user_stats
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON public.user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create the badges table for available badges
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('streak', 'quest_count', 'weekly', 'level')),
    requirement INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the user_badges table for earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Create indexes for badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);

-- Enable RLS for badges tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Create policies for badges (everyone can view available badges)
CREATE POLICY "Anyone can view badges" ON public.badges
    FOR SELECT USING (true);

-- Create policies for user_badges
CREATE POLICY "Users can view their own badges" ON public.user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" ON public.user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, type, requirement) VALUES
('First Steps', 'Complete your first quest', 'fas fa-baby', 'quest_count', 1),
('Getting Started', 'Complete 5 quests', 'fas fa-seedling', 'quest_count', 5),
('Quest Master', 'Complete 10 quests', 'fas fa-trophy', 'quest_count', 10),
('Dedicated', 'Complete 25 quests', 'fas fa-medal', 'quest_count', 25),
('Legendary', 'Complete 50 quests', 'fas fa-crown', 'quest_count', 50),
('Streak Starter', 'Maintain a 3-day streak', 'fas fa-fire', 'streak', 3),
('On Fire', 'Maintain a 7-day streak', 'fas fa-fire-flame-curved', 'streak', 7),
('Unstoppable', 'Maintain a 14-day streak', 'fas fa-fire-flame-simple', 'streak', 14),
('Weekly Warrior', 'Complete 7 quests in a week', 'fas fa-calendar-week', 'weekly', 7),
('Level Up', 'Reach level 5', 'fas fa-star', 'level', 5),
('Rising Star', 'Reach level 10', 'fas fa-star-half-stroke', 'level', 10),
('Elite', 'Reach level 20', 'fas fa-stars', 'level', 20)
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.quests TO authenticated;
GRANT ALL ON public.quests TO service_role;
GRANT ALL ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
GRANT ALL ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
GRANT ALL ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;

-- NOTE: After running this schema, also run daily_quest_migration.sql
-- to add daily quest reset functionality