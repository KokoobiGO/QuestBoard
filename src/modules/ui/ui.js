// ui.js - Handles user interface functionality

/**
 * Initialize UI module
 * @param {Object} elements - DOM elements object (all frequently-used DOM nodes)
 * @param {Object} stats - Stats module for displaying user stats
 * @returns {Object} - Exposed UI helper functions
 */
function initUI(elements, stats) {
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
        elements.questType.value = 'Daily';
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

        const iconForType = (t) => {
            const tt = (t || '').toLowerCase();
            if (tt === 'daily') return 'fa-sun';
            if (tt === 'weekly') return 'fa-calendar-week';
            return 'fa-star';
        };

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
                    ${quest.completed ? '' : '<button class="quest-btn complete-btn" aria-label="Complete"><i class="fas fa-check"></i></button>'}
                    <button class="quest-btn delete-btn" aria-label="Delete"><i class="fas fa-trash"></i></button>
                    <span class="due-date"><i class="fas fa-clock"></i> ${due}</span>
                </div>
            `;
            elements.questsContainer.appendChild(questCard);
        });
    }
    /* ------------------------------------------------------------------
     * Event-listener/* ------------------------------------------------------------------
     * Event-listener initialisation hooks
     * ---------------------------------------------------------------- */
    function initEventListeners(callbacks = {}) {
        const { onFilterChange, onCompleteQuest, onDeleteQuest } = callbacks;

        // Show modal
        elements.createQuestBtn?.addEventListener('click', () => toggleQuestFormModal(true));
        // Close modal
        elements.closeModal?.addEventListener('click', () => toggleQuestFormModal(false));
        // Clear quest form
        elements.clearQuestBtn?.addEventListener('click', () => clearQuestForm());

        // Additional external callbacks (complete, delete, filter etc.) can be wired through here
        if (onFilterChange) {
            elements.typeFilter?.addEventListener('change', () => {
                onFilterChange(elements.typeFilter.value, elements.showCompleted.checked);
            });
            elements.showCompleted?.addEventListener('change', () => {
                onFilterChange(elements.typeFilter.value, elements.showCompleted.checked);
            });
        }

        // Delegated quest actions
        if (elements.questsContainer) {
            elements.questsContainer.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                const card = e.target.closest('.quest-item');
                if (!card) return;
                const id = card.dataset.id;
                if (target.classList.contains('complete-btn')) {
                    onCompleteQuest && onCompleteQuest(id);
                } else if (target.classList.contains('delete-btn')) {
                    onDeleteQuest && onDeleteQuest(id);
                }
            });
        }
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
        updateUserInfo,
        clearQuestForm,
        toggleQuestFormModal,
        renderQuests,
        initEventListeners
    };
}

export { initUI };