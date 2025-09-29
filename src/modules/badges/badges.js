/**
 * Badges Module
 * Handles badge logic, checking for earned badges, and awarding them
 */

export function initBadges(supabase) {
    let availableBadges = [];

    /**
     * Load all available badges from the database
     */
    async function loadBadges() {
        try {
            const { data, error } = await supabase
                .from('badges')
                .select('*')
                .order('requirement', { ascending: true });

            if (error) throw error;
            availableBadges = data || [];
            return availableBadges;
        } catch (error) {
            console.error('Error loading badges:', error);
            return [];
        }
    }

    /**
     * Get user's earned badges
     */
    async function getUserBadges(userId) {
        try {
            const { data, error } = await supabase
                .from('user_badges')
                .select(`
                    *,
                    badges (
                        name,
                        description,
                        icon,
                        type,
                        requirement
                    )
                `)
                .eq('user_id', userId)
                .order('earned_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching user badges:', error);
            return [];
        }
    }

    /**
     * Check and award badges based on user stats and quest completion
     */
    async function checkAndAwardBadges(userId, userStats, completedQuestsCount) {
        try {
            // Get current user badges to avoid duplicates
            const currentBadges = await getUserBadges(userId);
            const earnedBadgeIds = currentBadges.map(ub => ub.badge_id);

            const newBadges = [];

            // Check each available badge
            for (const badge of availableBadges) {
                if (earnedBadgeIds.includes(badge.id)) continue;

                let shouldAward = false;

                switch (badge.type) {
                    case 'quest_count':
                        shouldAward = completedQuestsCount >= badge.requirement;
                        break;
                    case 'streak':
                        shouldAward = userStats.current_streak >= badge.requirement;
                        break;
                    case 'level':
                        shouldAward = userStats.level >= badge.requirement;
                        break;
                    case 'weekly':
                        // Check quests completed in the last 7 days
                        const weeklyCount = await getWeeklyQuestCount(userId);
                        shouldAward = weeklyCount >= badge.requirement;
                        break;
                }

                if (shouldAward) {
                    // Award the badge
                    const { error } = await supabase
                        .from('user_badges')
                        .insert({
                            user_id: userId,
                            badge_id: badge.id
                        });

                    if (!error) {
                        newBadges.push({
                            ...badge,
                            earned_at: new Date().toISOString()
                        });
                    }
                }
            }

            return newBadges;
        } catch (error) {
            console.error('Error checking badges:', error);
            return [];
        }
    }

    /**
     * Get count of quests completed in the last 7 days
     */
    async function getWeeklyQuestCount(userId) {
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const { data, error } = await supabase
                .from('quests')
                .select('id')
                .eq('user_id', userId)
                .eq('completed', true)
                .gte('updated_at', weekAgo.toISOString());

            if (error) throw error;
            return data?.length || 0;
        } catch (error) {
            console.error('Error getting weekly quest count:', error);
            return 0;
        }
    }

    /**
     * Get total completed quests count for a user
     */
    async function getCompletedQuestsCount(userId) {
        try {
            const { data, error } = await supabase
                .from('quests')
                .select('id')
                .eq('user_id', userId)
                .eq('completed', true);

            if (error) throw error;
            return data?.length || 0;
        } catch (error) {
            console.error('Error getting completed quests count:', error);
            return 0;
        }
    }

    /**
     * Show badge notification
     */
    function showBadgeNotification(badge) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = `
            <div class="badge-notification-content">
                <i class="${badge.icon} badge-icon"></i>
                <div class="badge-info">
                    <h4>Badge Earned!</h4>
                    <p><strong>${badge.name}</strong></p>
                    <p>${badge.description}</p>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Initialize badges on module load
    loadBadges();

    return {
        loadBadges,
        getUserBadges,
        checkAndAwardBadges,
        getCompletedQuestsCount,
        showBadgeNotification
    };
}