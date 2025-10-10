// quests.js - Handles quest functionality

// Global state
let quests = [];

const QUEST_COLUMNS = 'id,user_id,title,description,type,due_date,completed,created_at,template_id,reset_date,is_recurring';

/**
 * Initialize quests module
 * @param {Object} supabase - Supabase client instance
 * @param {Object} stats - Stats module for XP/coins updates
 * @returns {Object} - Quests module methods
 */
function initQuests(supabase, stats) {
    // Update streak when quest is completed
    async function updateQuestStreak(userId) {
        try {
            // Use local date instead of UTC to avoid timezone issues
            const today = new Date();
            const todayString = today.getFullYear() + '-' + 
                String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                String(today.getDate()).padStart(2, '0');
            
            // Get current user stats
            const { data: userStats, error: fetchError } = await supabase
                .from('user_stats')
                .select('current_streak, longest_streak, last_activity_date')
                .eq('user_id', userId)
                .single();
            
            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error fetching user stats for quest streak:', fetchError);
                return;
            }
            
            // Only update if this is the first quest completed today
            if (userStats?.last_activity_date === todayString) {
                // Already completed a quest today, no need to update streak
                return;
            }
            
            let newStreak = 1;
            let newLongestStreak = userStats?.longest_streak || 1;
            
            if (userStats?.last_activity_date) {
                const lastActivity = new Date(userStats.last_activity_date);
                const todayDate = new Date(todayString);
                const diffTime = todayDate - lastActivity;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    // Consecutive day, increment streak
                    newStreak = (userStats.current_streak || 0) + 1;
                } else if (diffDays > 1) {
                    // Streak broken, reset to 1
                    newStreak = 1;
                } else {
                    // Same day, maintain current streak
                    newStreak = userStats.current_streak || 1;
                }
            }
            
            // Update longest streak if current streak is higher
            if (newStreak > newLongestStreak) {
                newLongestStreak = newStreak;
            }
            
            // Update user stats with new streak data
            const { error: updateError } = await supabase
                .from('user_stats')
                .upsert({
                    user_id: userId,
                    current_streak: newStreak,
                    longest_streak: newLongestStreak,
                    last_activity_date: todayString
                }, {
                    onConflict: 'user_id'
                });
            
            if (updateError) {
                console.error('Error updating quest streak:', updateError);
            }
        } catch (e) {
            console.error('Error in updateQuestStreak:', e);
        }
    }

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

    // Fetch only today's quests (including recurring ones)
    async function fetchTodaysQuests(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data, error } = await supabase
                .from('quests')
                .select(QUEST_COLUMNS)
                .eq('user_id', userId)
                .or(`reset_date.eq.${today},is_recurring.eq.false`)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching today\'s quests:', error);
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
                created_at: new Date().toISOString(),
                template_id: questData.template_id || null,
                reset_date: questData.reset_date || new Date().toISOString().split('T')[0],
                is_recurring: questData.is_recurring || false
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

            // Calculate rewards based on quest type
            let xpReward = 10; // base XP
            let coinReward = 5; // base coins
            
            switch (quest.type) {
                case 'daily':
                    xpReward = 15;
                    coinReward = 8;
                    break;
                case 'weekly':
                    xpReward = 50;
                    coinReward = 25;
                    break;
                case 'one_time':
                    xpReward = 25;
                    coinReward = 15;
                    break;
                default:
                    xpReward = 10;
                    coinReward = 5;
            }

            // Update quest in database
            const { error } = await supabase
                .from('quests')
                .update({ completed: true })
                .eq('id', questId);

            if (error) throw error;

            const updatedQuest = { ...quest, completed: true };
            quests = quests.map(q => (q.id === questId ? updatedQuest : q));

            stats.addXp(xpReward);
            stats.addCoins(coinReward);

            const userStats = stats.getUserStats();
            
            // Update streak when quest is completed
            await updateQuestStreak(updatedQuest.user_id || quest.user_id);
            
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

    // Update an existing quest
    async function updateQuest(questId, updateData) {
        try {
            const typeMap = {
                'Daily': 'daily',
                'Weekly': 'weekly',
                'One-time': 'one_time',
                'Monthly': 'monthly'
            };
            const mappedType = typeMap[updateData.type] || updateData.type.toLowerCase();

            const updatedQuest = {
                ...updateData,
                type: mappedType,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('quests')
                .update(updatedQuest)
                .eq('id', questId)
                .select(QUEST_COLUMNS)
                .single();

            if (error) throw error;

            // Update local quests array
            quests = quests.map(q => (q.id === questId ? data : q));

            return { success: true, quest: data };
        } catch (error) {
            console.error('Error updating quest:', error);
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
        fetchTodaysQuests,
        createQuest,
        updateQuest,
        completeQuest,
        deleteQuest,
        getQuests,
        filterQuests
    };
}

export { initQuests };
