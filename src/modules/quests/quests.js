// quests.js - Handles quest functionality

// Global state
let quests = [];

const QUEST_COLUMNS = 'id,user_id,title,description,type,due_date,completed,created_at';

/**
 * Initialize quests module
 * @param {Object} supabase - Supabase client instance
 * @param {Object} stats - Stats module for XP/coins updates
 * @returns {Object} - Quests module methods
 */
function initQuests(supabase, stats) {
    // Fetch quests for current user
    async function fetchQuests(userId) {
        try {
            const { data, error } = await supabase
                .from('quests')
                .select(QUEST_COLUMNS)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            quests = data || [];
            return quests;
        } catch (error) {
            console.error('Error fetching quests:', error);
            return [];
        }
    }

    // Create a new quest
    async function createQuest(questData, userId) {
        try {
            const typeMap = {
                'Daily': 'daily',
                'Weekly': 'weekly',
                'One-time': 'one_time',
                'Monthly': 'monthly'
            };
            const mappedType = typeMap[questData.type] || questData.type.toLowerCase();

            const newQuest = {
                ...questData,
                type: mappedType,
                user_id: userId,
                completed: false,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('quests')
                .insert([newQuest])
                .select(QUEST_COLUMNS);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                quests = [data[0], ...quests];
                return { success: true, quest: data[0] };
            }
            
            return { success: false, error: 'No data returned' };
        } catch (error) {
            console.error('Error creating quest:', error);
            return { success: false, error: error.message };
        }
    }

    // Complete a quest
    async function completeQuest(questId) {
        try {
            const quest = quests.find(q => q.id === questId);

            if (!quest) {
                return { success: false, error: 'Quest not found' };
            }

            if (quest.completed) {
                return { success: true, quest, rewards: { xp: 0, coins: 0 } };
            }

            const { data, error } = await supabase
                .from('quests')
                .update({ completed: true })
                .eq('id', questId)
                .select(QUEST_COLUMNS)
                .maybeSingle();

            if (error) throw error;

            const persistedQuest = data ? { ...quest, ...data } : { ...quest, completed: true };
            const normalizedType = (persistedQuest.type || quest.type || '').toLowerCase();
            let xpReward = 0;
            let coinReward = 0;

            switch (normalizedType) {
                case 'daily':
                    xpReward = 10;
                    coinReward = 1;
                    break;
                case 'weekly':
                    xpReward = 50;
                    coinReward = 5;
                    break;
                case 'one_time':
                    xpReward = 25;
                    coinReward = 3;
                    break;
                default:
                    xpReward = 5;
                    coinReward = 1;
            }

            const updatedQuest = { ...persistedQuest, completed: true };
            quests = quests.map(q => (q.id === questId ? updatedQuest : q));

            stats.addXp(xpReward);
            stats.addCoins(coinReward);

            const userStats = stats.getUserStats();
            const { error: statsError } = await supabase
                .from('user_stats')
                .update({
                    xp: userStats.xp,
                    coins: userStats.coins
                })
                .eq('user_id', updatedQuest.user_id || quest.user_id);

            if (statsError) {
                console.error('Error updating stats:', statsError);
            }

            return {
                success: true,
                quest: updatedQuest,
                rewards: { xp: xpReward, coins: coinReward }
            };
        } catch (error) {
            console.error('Error completing quest:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete a quest
    async function deleteQuest(questId) {
        try {
            const { error } = await supabase
                .from('quests')
                .delete()
                .eq('id', questId);
            
            if (error) throw error;
            
            quests = quests.filter(q => q.id !== questId);
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting quest:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all quests
    function getQuests() {
        return quests;
    }

    // Filter quests by type and completion status
    function filterQuests(type = 'All', showCompleted = false) {
        const normalizedType = typeof type === 'string' ? type.toLowerCase() : 'all';

        return quests.filter(quest => {
            const questType = (quest.type || '').toLowerCase();
            const typeMatch = normalizedType === 'all' || questType === normalizedType;
            const completionMatch = showCompleted || !quest.completed;
            return typeMatch && completionMatch;
        });
    }

    return {
        fetchQuests,
        createQuest,
        completeQuest,
        deleteQuest,
        getQuests,
        filterQuests
    };
}

export { initQuests };
