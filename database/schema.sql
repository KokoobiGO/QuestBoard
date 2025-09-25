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

-- Grant necessary permissions
GRANT ALL ON public.quests TO authenticated;
GRANT ALL ON public.quests TO service_role;
GRANT ALL ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;