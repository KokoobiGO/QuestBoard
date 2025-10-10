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
    
    // Store current quests for edit functionality
    let currentQuests = [];

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
            if (elements.authTitle) elements.authTitle.textContent = 'Create Account';
            if (elements.authSubtitle) elements.authSubtitle.textContent = 'Start your quest journey';
            if (elements.authIcon) elements.authIcon.className = 'fas fa-user-plus';
            if (elements.nameField) elements.nameField.classList.remove('hidden');
            if (elements.submitText) elements.submitText.textContent = 'Sign Up';
            if (elements.toggleText) elements.toggleText.textContent = 'Already have an account? Sign In';
        } else {
            if (elements.authTitle) elements.authTitle.textContent = 'Welcome Back';
            if (elements.authSubtitle) elements.authSubtitle.textContent = 'Continue your quest journey';
            if (elements.authIcon) elements.authIcon.className = 'fas fa-sign-in-alt';
            if (elements.nameField) elements.nameField.classList.add('hidden');
            if (elements.submitText) elements.submitText.textContent = 'Sign In';
            if (elements.toggleText) elements.toggleText.textContent = 'Need an account? Sign Up';
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
            if (elements.userInfo) elements.userInfo.classList.remove('hidden');
            // Update profile username
            if (elements.profileUsername) {
                const displayName = user.user_metadata?.full_name || user.email || 'User';
                elements.profileUsername.textContent = displayName;
            }
        } else {
            if (elements.userInfo) elements.userInfo.classList.add('hidden');
            if (elements.profileUsername) {
                elements.profileUsername.textContent = 'Loading...';
            }
        }
    }

    /* ------------------------------------------------------------------
     * Quest modal helpers
     * ---------------------------------------------------------------- */
    function clearQuestForm() {
        if (elements.questTitle) elements.questTitle.value = '';
        if (elements.questDescription) elements.questDescription.value = '';
        if (elements.questType) elements.questType.value = 'daily';
        if (elements.questDueDate) elements.questDueDate.value = '';
        if (elements.isRecurring) elements.isRecurring.checked = false;
        
        // Show recurring field for daily type, hide due date field
        if (elements.recurringField) elements.recurringField.style.display = 'block';
        if (elements.dueDateField) elements.dueDateField.style.display = 'block';
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

    // Toggle edit quest modal
    function toggleEditQuestModal(show = true) {
        const modal = elements.editQuestModal;
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

    // Populate edit form with quest data
    function populateEditForm(quest) {
        if (!quest) return;

        if (elements.editQuestTitle) elements.editQuestTitle.value = quest.title || '';
        if (elements.editQuestDescription) elements.editQuestDescription.value = quest.description || '';
        if (elements.editQuestType) elements.editQuestType.value = quest.type || 'daily';
        if (elements.editIsRecurring) elements.editIsRecurring.checked = quest.is_recurring || false;
        
        // Handle due date
        if (elements.editQuestDueDate && quest.due_date) {
            const dueDate = new Date(quest.due_date);
            const localDateTime = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000);
            elements.editQuestDueDate.value = localDateTime.toISOString().slice(0, 16);
        }

        // Show/hide recurring field based on type
        const isDaily = quest.type === 'daily';
        if (elements.editRecurringField) {
            elements.editRecurringField.style.display = isDaily ? 'block' : 'none';
        }
        if (elements.editDueDateField) {
            elements.editDueDateField.style.display = isDaily && quest.is_recurring ? 'none' : 'block';
        }
    }

    // Clear edit quest form
    function clearEditQuestForm() {
        if (elements.editQuestTitle) elements.editQuestTitle.value = '';
        if (elements.editQuestDescription) elements.editQuestDescription.value = '';
        if (elements.editQuestType) elements.editQuestType.value = 'daily';
        if (elements.editQuestDueDate) elements.editQuestDueDate.value = '';
        if (elements.editIsRecurring) elements.editIsRecurring.checked = false;
        
        // Show recurring field for daily type, hide due date field
        if (elements.editRecurringField) elements.editRecurringField.style.display = 'block';
        if (elements.editDueDateField) elements.editDueDateField.style.display = 'block';
    }

    /* ------------------------------------------------------------------
     * Render quests list (placeholder – could be improved)
     * ---------------------------------------------------------------- */
    function renderQuests(quests = [], filterType = 'all', showCompleted = false) {
        console.log('[UI] renderQuests called with:', { quests, filterType, showCompleted });
        
        // Store quests for edit functionality
        currentQuests = quests;
        
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
            if (elements.questCount) elements.questCount.textContent = '0 quests';
            return;
        }

        elements.emptyState.classList.add('hidden');
        if (elements.questCount) elements.questCount.textContent = `${filteredQuests.length} quests`;

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
                    <button class="quest-btn edit-btn" aria-label="Edit Quest"><i class="fas fa-edit"></i></button>
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

        // Edit modal event listeners
        elements.closeEditModal?.addEventListener('click', () => toggleEditQuestModal(false));
        elements.cancelEditBtn?.addEventListener('click', () => toggleEditQuestModal(false));

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
                } else if (target.classList.contains('edit-btn')) {
                    const questItem = target.closest('.quest-item');
                    const questId = questItem.dataset.id;
                    
                    // Find the quest data from currentQuests
                    const quest = currentQuests.find(q => q.id === questId);
                    if (quest) {
                        populateEditForm(quest);
                        toggleEditQuestModal(true);
                        // Store quest ID for update
                        if (elements.editQuestModal) {
                            elements.editQuestModal.dataset.questId = questId;
                        }
                    }
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
        // Update stats (level, coins, and streak)
        const profileLevel = document.getElementById('profileLevel');
        const profileCoins = document.getElementById('profileCoins');
        const profileStreak = document.getElementById('profileStreak');

        if (profileLevel) profileLevel.textContent = userStats.level || 1;
        if (profileCoins) profileCoins.textContent = userStats.coins || 0;
        if (profileStreak) profileStreak.textContent = userStats.current_streak || 0;

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
        toggleEditQuestModal,
        populateEditForm,
        clearEditQuestForm,
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
