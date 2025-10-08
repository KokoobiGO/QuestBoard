-- Migration for Daily Quest Reset System
-- Run this after the main schema.sql

-- Create quest_templates table for recurring daily quests
CREATE TABLE IF NOT EXISTS public.quest_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing quests table
ALTER TABLE public.quests 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.quest_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quest_templates_user_id ON public.quest_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_templates_type ON public.quest_templates(type);
CREATE INDEX IF NOT EXISTS idx_quests_template_id ON public.quests(template_id);
CREATE INDEX IF NOT EXISTS idx_quests_reset_date ON public.quests(reset_date);
CREATE INDEX IF NOT EXISTS idx_quests_recurring ON public.quests(is_recurring);

-- Enable RLS for quest_templates
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for quest_templates
CREATE POLICY "Users can view their own quest templates" ON public.quest_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quest templates" ON public.quest_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quest templates" ON public.quest_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quest templates" ON public.quest_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for quest_templates updated_at
CREATE TRIGGER update_quest_templates_updated_at
    BEFORE UPDATE ON public.quest_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.quest_templates TO authenticated;
GRANT ALL ON public.quest_templates TO service_role;

-- Function to reset daily quests
CREATE OR REPLACE FUNCTION reset_daily_quests()
RETURNS void AS $$
DECLARE
    template_record RECORD;
    new_due_date TIMESTAMPTZ;
BEGIN
    -- Loop through all active daily quest templates
    FOR template_record IN 
        SELECT qt.*, u.id as user_id
        FROM public.quest_templates qt
        JOIN auth.users u ON qt.user_id = u.id
        WHERE qt.type = 'daily' AND qt.is_active = TRUE
    LOOP
        -- Check if there's already a quest for today from this template
        IF NOT EXISTS (
            SELECT 1 FROM public.quests 
            WHERE template_id = template_record.id 
            AND reset_date = CURRENT_DATE
        ) THEN
            -- Set due date to end of today (23:59:59)
            new_due_date := (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
            
            -- Create new quest instance from template
            INSERT INTO public.quests (
                title, 
                description, 
                type, 
                due_date, 
                user_id, 
                template_id, 
                reset_date, 
                is_recurring,
                completed
            ) VALUES (
                template_record.title,
                template_record.description,
                template_record.type,
                new_due_date,
                template_record.user_id,
                template_record.id,
                CURRENT_DATE,
                TRUE,
                FALSE
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a daily quest template and its first instance
CREATE OR REPLACE FUNCTION create_daily_quest_template(
    p_title VARCHAR(255),
    p_description TEXT,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    template_id UUID;
    new_due_date TIMESTAMPTZ;
BEGIN
    -- Create the template
    INSERT INTO public.quest_templates (title, description, type, user_id)
    VALUES (p_title, p_description, 'daily', p_user_id)
    RETURNING id INTO template_id;
    
    -- Create the first quest instance for today
    new_due_date := (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
    
    INSERT INTO public.quests (
        title, 
        description, 
        type, 
        due_date, 
        user_id, 
        template_id, 
        reset_date, 
        is_recurring,
        completed
    ) VALUES (
        p_title,
        p_description,
        'daily',
        new_due_date,
        p_user_id,
        template_id,
        CURRENT_DATE,
        TRUE,
        FALSE
    );
    
    RETURN template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION reset_daily_quests() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_daily_quests() TO service_role;
GRANT EXECUTE ON FUNCTION create_daily_quest_template(VARCHAR(255), TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_daily_quest_template(VARCHAR(255), TEXT, UUID) TO service_role;