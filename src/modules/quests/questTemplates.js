// questTemplates.js - Handles quest template functionality for recurring daily quests

// Global state
let questTemplates = [];

const TEMPLATE_COLUMNS = 'id,user_id,title,description,type,is_active,created_at';
const QUEST_COLUMNS = 'id,user_id,title,description,type,due_date,completed,created_at,template_id,reset_date,is_recurring';

/**
 * Initialize quest templates module
 * @param {Object} supabase - Supabase client instance
 * @returns {Object} - Quest templates module methods
 */
function initQuestTemplates(supabase) {
    
    // Fetch quest templates for current user
    async function fetchQuestTemplates(userId) {
        try {
            const { data, error } = await supabase
                .from('quest_templates')
                .select(TEMPLATE_COLUMNS)
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            questTemplates = data || [];
            return questTemplates;
        } catch (error) {
            console.error('Error fetching quest templates:', error);
            return [];
        }
    }

    // Create a new quest template
    async function createQuestTemplate(templateData, userId) {
        try {
            const newTemplate = {
                title: templateData.title,
                description: templateData.description,
                type: templateData.type || 'daily',
                user_id: userId,
                is_active: true,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('quest_templates')
                .insert([newTemplate])
                .select(TEMPLATE_COLUMNS);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                questTemplates = [data[0], ...questTemplates];
                return { success: true, template: data[0] };
            }
            
            return { success: false, error: 'No data returned' };
        } catch (error) {
            console.error('Error creating quest template:', error);
            return { success: false, error: error.message };
        }
    }

    // Create a daily quest template and its first instance
    async function createDailyQuestTemplate(templateData, userId) {
        try {
            // Use the database function to create template and first instance
            const { data, error } = await supabase
                .rpc('create_daily_quest_template', {
                    p_title: templateData.title,
                    p_description: templateData.description,
                    p_user_id: userId
                });
            
            if (error) throw error;
            
            // Refresh templates
            await fetchQuestTemplates(userId);
            
            return { success: true, templateId: data };
        } catch (error) {
            console.error('Error creating daily quest template:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset daily quests (create new instances from templates)
    async function resetDailyQuests() {
        try {
            const { error } = await supabase
                .rpc('reset_daily_quests');
            
            if (error) throw error;
            
            return { success: true };
        } catch (error) {
            console.error('Error resetting daily quests:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if daily quests need to be reset and do it automatically
    async function checkAndResetDailyQuests(userId) {
        try {
            // Get today's date
            const today = new Date().toISOString().split('T')[0];
            
            // Check if there are any daily quest templates
            const templates = await fetchQuestTemplates(userId);
            const dailyTemplates = templates.filter(t => t.type === 'daily');
            
            if (dailyTemplates.length === 0) {
                return { success: true, message: 'No daily templates found' };
            }

            // Check if we already have quests for today from these templates
            const { data: todaysQuests, error } = await supabase
                .from('quests')
                .select('template_id')
                .eq('user_id', userId)
                .eq('reset_date', today)
                .eq('is_recurring', true);
            
            if (error) throw error;
            
            const existingTemplateIds = new Set(todaysQuests?.map(q => q.template_id) || []);
            const needReset = dailyTemplates.some(t => !existingTemplateIds.has(t.id));
            
            if (needReset) {
                await resetDailyQuests();
                return { success: true, message: 'Daily quests reset successfully' };
            }
            
            return { success: true, message: 'Daily quests already up to date' };
        } catch (error) {
            console.error('Error checking and resetting daily quests:', error);
            return { success: false, error: error.message };
        }
    }

    // Get today's recurring quests
    async function getTodaysRecurringQuests(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data, error } = await supabase
                .from('quests')
                .select(QUEST_COLUMNS)
                .eq('user_id', userId)
                .eq('reset_date', today)
                .eq('is_recurring', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching today\'s recurring quests:', error);
            return [];
        }
    }

    // Deactivate a quest template
    async function deactivateQuestTemplate(templateId) {
        try {
            const { error } = await supabase
                .from('quest_templates')
                .update({ is_active: false })
                .eq('id', templateId);
            
            if (error) throw error;
            
            // Remove from local state
            questTemplates = questTemplates.filter(t => t.id !== templateId);
            
            return { success: true };
        } catch (error) {
            console.error('Error deactivating quest template:', error);
            return { success: false, error: error.message };
        }
    }

    // Update a quest template
    async function updateQuestTemplate(templateId, updateData) {
        try {
            const { data, error } = await supabase
                .from('quest_templates')
                .update({
                    title: updateData.title,
                    description: updateData.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId)
                .select(TEMPLATE_COLUMNS);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                // Update local state
                questTemplates = questTemplates.map(t => 
                    t.id === templateId ? data[0] : t
                );
                return { success: true, template: data[0] };
            }
            
            return { success: false, error: 'No data returned' };
        } catch (error) {
            console.error('Error updating quest template:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all quest templates
    function getQuestTemplates() {
        return questTemplates;
    }

    return {
        fetchQuestTemplates,
        createQuestTemplate,
        createDailyQuestTemplate,
        resetDailyQuests,
        checkAndResetDailyQuests,
        getTodaysRecurringQuests,
        deactivateQuestTemplate,
        updateQuestTemplate,
        getQuestTemplates
    };
}

export { initQuestTemplates };