// ui.js - Handles user interface functionality

/**
 * Initialize UI module
 * @param {Object} elements - DOM elements object (all frequently-used DOM nodes)
 * @param {Object} stats - Stats module for displaying user stats
 * @returns {Object} - Exposed UI helper functions
 */
function initUI(elements, stats) {
    // Keep track of the latest callbacks passed into initEventListeners so
    // other helpers (like updateUserInfo) can safely reference them.
    let registeredCallbacks = {};

    /* ------------------------------------------------------------------
     * Generic helpers
     * ---------------------------------------------------------------- */
    function showLoading() {
        elements.loadingOverlay?.classList.remove('hidden');
    }

    function hideLoading() {
        elements.loadingOverlay?.classList.add('hidden');
    }

    /* ------------------------------------------------------------------
     * Auth / Dashboard switching
     * ---------------------------------------------------------------- */
    function showAuth(isSignUp = false) {
        elements.authContainer?.classList.remove('hidden');
        elements.dashboard?.classList.add('hidden');
        elements.navActions?.classList.add('hidden');
        elements.statsContainer?.classList.add('hidden');
        elements.userInfo?.classList.add('hidden');

        if (!elements.authTitle) return; // guard – HTML not loaded yet
        if (isSignUp) {
            elements.authTitle.textContent = 'Create Account';
            elements.authSubtitle.textContent = 'Start your quest journey';
            elements.authIcon.className = 'fas fa-user-plus';
            elements.nameField.classList.remove('hidden');
            elements.submitText.textContent = 'Sign Up';
            elements.toggleText.textContent = 'Already have an account? Sign In';
        } else {
            elements.authTitle.textContent = 'Welcome Back';
            elements.authSubtitle.textContent = 'Continue your quest journey';
            elements.authIcon.className = 'fas fa-sign-in-alt';
            elements.nameField.classList.add('hidden');
            elements.submitText.textContent = 'Sign In';
            elements.toggleText.textContent = 'Need an account? Sign Up';
        }
    }

    function showDashboard() {
        elements.authContainer?.classList.add('hidden');
        elements.dashboard?.classList.remove('hidden');
        elements.navActions?.classList.remove('hidden');
        elements.statsContainer?.classList.remove('hidden');
        elements.userInfo?.classList.remove('hidden');
    }

    /* ------------------------------------------------------------------
     * Messages
     * ---------------------------------------------------------------- */
    function _showMessage(targetEl, message, isError = false) {
        if (!targetEl) return;
        targetEl.textContent = message;
        targetEl.classList.remove('hidden', 'error', 'success');
        targetEl.classList.add(isError ? 'error' : 'success');
        setTimeout(() => { targetEl.classList.add('hidden'); targetEl.classList.remove('error','success'); }, 4000);
    }

    const showAuthMessage = (msg, err = false) => _showMessage(elements.authMessage, msg, err);
    const showQuestMessage = (msg, err = false) => _showMessage(elements.questMessage, msg, err);

    /* ------------------------------------------------------------------
     * Stats helpers
     * ---------------------------------------------------------------- */
    function updateStatsDisplay() {
        if (!stats) return;
        const userStats = stats.getUserStats();
        if (elements.xpCounter) elements.xpCounter.textContent = userStats.xp;
        if (elements.coinsCounter) elements.coinsCounter.textContent = userStats.coins;
        if (elements.levelCounter) elements.levelCounter.textContent = userStats.level;

        const progress = stats.calculateXpProgress(userStats.xp, userStats.level);
        if (elements.xpProgressBar) elements.xpProgressBar.style.width = `${progress}%`;

        elements.statsContainer?.classList.remove('hidden');
    }

    async function updateStreakDisplay(supabase, userId) {
        if (!supabase || !userId || !elements.streakCounter) return;
        
        try {
            const { data: userStats, error } = await supabase
                .from('user_stats')
                .select('current_streak')
                .eq('user_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching streak:', error);
                return;
            }
            
            const currentStreak = userStats?.current_streak || 0;
            elements.streakCounter.textContent = currentStreak;
            
            // Add visual effects for streak milestones
            const streakItem = elements.streakCounter.closest('.streak-item');
            if (streakItem) {
                streakItem.classList.remove('streak-milestone', 'streak-fire');
                if (currentStreak >= 7) {
                    streakItem.classList.add('streak-fire');
                } else if (currentStreak >= 3) {
                    streakItem.classList.add('streak-milestone');
                }
            }
        } catch (e) {
            console.error('Error in updateStreakDisplay:', e);
        }
    }

    function updateUserInfo(user) {
        if (user) {
            elements.userInfo.classList.remove('hidden');
            elements.userEmailText.textContent = user.email;
        } else {
            elements.userInfo.classList.add('hidden');
        }
    }

    /* ------------------------------------------------------------------
     * Quest modal helpers
     * ---------------------------------------------------------------- */
    function clearQuestForm() {
        elements.questTitle.value = '';
        elements.questDescription.value = '';
        elements.questType.value = 'daily';
        elements.questDueDate.value = '';
    }

    // Adds/removes CSS classes for smooth fade
    function toggleQuestFormModal(show = true) {
        const modal = elements.questFormModal;
        if (!modal) return;

        if (show) {
            modal.style.display = 'flex';
            requestAnimationFrame(() => modal.classList.add('open'));
        } else {
            modal.classList.remove('open');
            modal.addEventListener('transitionend', function handler() {
                modal.style.display = 'none';
                modal.removeEventListener('transitionend', handler);
            });
        }
    }

    /* ------------------------------------------------------------------
     * Render quests list (placeholder – could be improved)
     * ---------------------------------------------------------------- */
    function renderQuests(quests = [], filterType = 'all', showCompleted = false) {
        console.log('[UI] renderQuests called with:', { quests, filterType, showCompleted });
        elements.questsContainer.innerHTML = '';

        const normalizedFilter = (filterType || 'all').toLowerCase();
        const filteredQuests = quests.filter(quest => {
            const typeMatch = normalizedFilter === 'all' || (quest.type || '').toLowerCase() == normalizedFilter;
            const completionMatch = showCompleted || !quest.completed;
            return typeMatch && completionMatch;
        });

        console.log(`[UI] Found ${filteredQuests.length} quests to render after filtering.`);

        if (filteredQuests.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.questCount.textContent = '0 quests';
            return;
        }

        elements.emptyState.classList.add('hidden');
        elements.questCount.textContent = `${filteredQuests.length} quests`;

        filteredQuests.forEach(quest => {
            const questCard = document.createElement('div');
            questCard.className = `quest-item ${quest.completed ? 'completed' : ''}`;
            questCard.dataset.id = quest.id;

            const typeIcon = iconForType(quest.type);
            const due = quest.due_date ? new Date(quest.due_date).toLocaleString() : 'No due date';

            questCard.innerHTML = `
                <div class="quest-title">
                    <span class="quest-type"><i class="fas ${typeIcon}"></i> ${(quest.type || '').replace('_',' ')}</span>
                    <div>${quest.title}</div>
                </div>
                <div class="quest-description">${quest.description || ''}</div>
                <div class="quest-actions">
                    ${quest.completed ? '' : '<button class="quest-btn complete-btn" aria-label="Complete Quest">Complete Quest</button>'}
                    <button class="quest-btn delete-btn" aria-label="Delete"><i class="fas fa-trash"></i></button>
                    <span class="due-date"><i class="fas fa-clock"></i> ${due}</span>
                </div>
            `;
            elements.questsContainer.appendChild(questCard);
        });
    }
    
    /* ------------------------------------------------------------------
     * Helper functions
     * ---------------------------------------------------------------- */
    function iconForType(type) {
        const normalizedType = (type || '').toLowerCase();
        switch (normalizedType) {
            case 'daily':
                return 'fa-calendar-day';
            case 'weekly':
                return 'fa-calendar-week';
            case 'one_time':
                return 'fa-star';
            default:
                return 'fa-tasks';
        }
    }

    /* ------------------------------------------------------------------
     * Event-listener initialisation hooks
     * ---------------------------------------------------------------- */
    function initEventListeners(callbacks = {}) {
        // Store callbacks for later use
        registeredCallbacks = callbacks;

        // Show modal
        elements.createQuestBtn?.addEventListener('click', () => toggleQuestFormModal(true));
        // Close modal
        elements.closeModal?.addEventListener('click', () => toggleQuestFormModal(false));
        // Clear quest form
        elements.clearQuestBtn?.addEventListener('click', () => clearQuestForm());

        // Delegated quest actions
        if (elements.questsContainer) {
            elements.questsContainer.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                const card = e.target.closest('.quest-item');
                if (!card) return;
                const id = card.dataset.id;
                
                if (target.classList.contains('complete-btn') && callbacks.onComplete) {
                    callbacks.onComplete(id);
                } else if (target.classList.contains('delete-btn') && callbacks.onDelete) {
                    callbacks.onDelete(id);
                }
            });
        }

        // Filter and show completed checkbox listeners
        if (elements.typeFilter && callbacks.onFilter) {
            elements.typeFilter.addEventListener('change', (e) => {
                callbacks.onFilter(e.target.value, elements.showCompleted?.checked || false);
            });
        }

        if (elements.showCompleted && callbacks.onFilter) {
            elements.showCompleted.addEventListener('change', (e) => {
                callbacks.onFilter(elements.typeFilter?.value || 'all', e.target.checked);
            });
        }
    }

    /* ------------------------------------------------------------------
     * Badge helpers
     * ---------------------------------------------------------------- */
    function renderBadges(allBadges, userBadges) {
        const badgesContainer = document.getElementById('badgesContainer');
        if (!badgesContainer) return;

        const earnedBadgeIds = userBadges.map(ub => ub.badge_id || ub.badges?.id);
        
        badgesContainer.innerHTML = `
            <div class="badges-header">
                <i class="fas fa-trophy"></i>
                <h3>Badges</h3>
                <span class="badges-count">${userBadges.length}/${allBadges.length}</span>
            </div>
            <div class="badges-grid">
                ${allBadges.map(badge => {
                    const isEarned = earnedBadgeIds.includes(badge.id);
                    const earnedBadge = userBadges.find(ub => 
                        (ub.badge_id || ub.badges?.id) === badge.id
                    );
                    
                    return `
                        <div class="badge-item ${isEarned ? 'earned' : 'locked'}">
                            <i class="${badge.icon} badge-icon"></i>
                            <div class="badge-name">${badge.name}</div>
                            <div class="badge-description">${badge.description}</div>
                            ${!isEarned ? `<div class="badge-requirement">Requirement: ${badge.requirement}</div>` : ''}
                            ${isEarned && earnedBadge ? `<div class="badge-requirement">Earned: ${new Date(earnedBadge.earned_at).toLocaleDateString()}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function updateBadgeCount(count, total) {
        const badgeCount = document.querySelector('.badges-count');
        if (badgeCount) {
            badgeCount.textContent = `${count}/${total}`;
        }
    }

    /* ------------------------------------------------------------------
     * Profile page functions
     * ---------------------------------------------------------------- */
    function showProfile() {
        elements.dashboard?.classList.add('hidden');
        elements.profilePage?.classList.remove('hidden');
    }

    function hideProfile() {
        elements.profilePage?.classList.add('hidden');
        elements.dashboard?.classList.remove('hidden');
    }

    function updateProfileData(user, userStats, questCounts, allBadges, userBadges) {
        // Update user info
        const profileEmail = document.getElementById('profileEmail');
        const profileMemberSince = document.getElementById('profileMemberSince');
        
        if (profileEmail) profileEmail.textContent = user.email || 'N/A';
        if (profileMemberSince) {
            const memberSince = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
            profileMemberSince.textContent = memberSince;
        }

        // Update stats
        const profileLevel = document.getElementById('profileLevel');
        const profileXP = document.getElementById('profileXP');
        const profileCoins = document.getElementById('profileCoins');
        const profileStreak = document.getElementById('profileStreak');

        if (profileLevel) profileLevel.textContent = userStats.level || 1;
        if (profileXP) profileXP.textContent = userStats.xp || 0;
        if (profileCoins) profileCoins.textContent = userStats.coins || 0;
        if (profileStreak) profileStreak.textContent = userStats.currentStreak || 0;

        // Update quest progress
        const profileTotalQuests = document.getElementById('profileTotalQuests');
        const profileWeeklyQuests = document.getElementById('profileWeeklyQuests');
        const profileDailyQuests = document.getElementById('profileDailyQuests');
        const profileWeeklyQuestType = document.getElementById('profileWeeklyQuestType');

        if (profileTotalQuests) profileTotalQuests.textContent = questCounts.total || 0;
        if (profileWeeklyQuests) profileWeeklyQuests.textContent = questCounts.weekly || 0;
        if (profileDailyQuests) profileDailyQuests.textContent = questCounts.daily || 0;
        if (profileWeeklyQuestType) profileWeeklyQuestType.textContent = questCounts.weeklyType || 0;

        // Update badges
        renderProfileBadges(allBadges, userBadges);
    }

    function renderProfileBadges(allBadges, userBadges) {
        const profileBadgesContainer = document.getElementById('profileBadges');
        if (!profileBadgesContainer) return;

        const userBadgeIds = new Set(userBadges.map(badge => badge.badge_id));

        profileBadgesContainer.innerHTML = allBadges.map(badge => {
            const isEarned = userBadgeIds.has(badge.id);
            return `
                <div class="profile-badge ${isEarned ? 'earned' : ''}">
                    <div class="profile-badge-icon">
                        <i class="${badge.icon}"></i>
                    </div>
                    <div class="profile-badge-name">${badge.name}</div>
                    <div class="profile-badge-description">${badge.description}</div>
                </div>
            `;
        }).join('');
    }

    /* ------------------------------------------------------------------
     * Public API
     * ---------------------------------------------------------------- */
    return {
        showLoading,
        hideLoading,
        showAuth,
        showDashboard,
        showAuthMessage,
        showQuestMessage,
        updateStatsDisplay,
        updateStreakDisplay,
        updateUserInfo,
        clearQuestForm,
        toggleQuestFormModal,
        renderQuests,
        renderBadges,
        updateBadgeCount,
        initEventListeners,
        showProfile,
        hideProfile,
        updateProfileData
    };
}

export { initUI };
