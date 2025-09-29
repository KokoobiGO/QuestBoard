// main.js - Main entry point for the application

import { initAuth } from './modules/auth/auth.js';
import { initQuests } from './modules/quests/quests.js';
import { initUI } from './modules/ui/ui.js';
import { initBadges } from './modules/badges/badges.js';
import * as statsModule from './modules/stats/stats.js';

// ---- Supabase ----
const SUPABASE_URL = 'https://knywwxyohcuwooxosgfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtueXd3eHlvaGN1d29veG9zZ2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTg5OTIsImV4cCI6MjA3Mjk5NDk5Mn0.7RwHL2gESUQzINB7EsUEMysEeVvof7RPTyA5WdX147E';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Debug
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key prefix:', SUPABASE_ANON_KEY?.slice(0, 10));
console.log('Current origin:', window.location.origin);

// ---- DOM ----
const elements = {
  loadingOverlay: document.getElementById('loadingOverlay'),
  // Auth
  authContainer: document.getElementById('authContainer'),
  authForm: document.getElementById('authForm'),
  authTitle: document.getElementById('authTitle'),
  authSubtitle: document.getElementById('authSubtitle'),
  authIcon: document.getElementById('authIcon'),
  authMessage: document.getElementById('authMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  fullName: document.getElementById('fullName'),
  nameField: document.getElementById('nameField'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  passwordHint: document.getElementById('passwordHint'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  submitIcon: document.getElementById('submitIcon'),
  submitText: document.getElementById('submitText'),
  clearBtn: document.getElementById('clearBtn'),
  toggleText: document.getElementById('toggleText'),
  toggleBtn: document.getElementById('toggleBtn'),
  // Nav
  navActions: document.getElementById('navActions'),
  userInfo: document.getElementById('userInfo'),
  userEmailText: document.getElementById('userEmailText'),
  bellBtn: document.getElementById('bellBtn'),
  profileBtn: document.getElementById('profileBtn'),
  // Profile page
  profilePage: document.getElementById('profilePage'),
  backToMainBtn: document.getElementById('backToMainBtn'),
  // Stats
  statsContainer: document.getElementById('statsContainer'),
  xpCounter: document.getElementById('xpCounter'),
  coinsCounter: document.getElementById('coinsCounter'),
  levelCounter: document.getElementById('levelCounter'),
  xpProgressBar: document.getElementById('xpProgressBar'),
  streakCounter: document.getElementById('streakCounter'),
  // Dashboard
  dashboard: document.getElementById('dashboard'),
  // Quest modal & form
  questFormModal: document.getElementById('questFormModal'),
  createQuestBtn: document.getElementById('createQuestBtn'),
  closeModal: document.getElementById('closeModal'),
  questForm: document.getElementById('questForm'),
  questMessage: document.getElementById('questMessage'),
  questTitle: document.getElementById('questTitle'),
  questDescription: document.getElementById('questDescription'),
  questType: document.getElementById('questType'),
  questDueDate: document.getElementById('questDueDate'),
  clearQuestBtn: document.getElementById('clearQuestBtn'),
  // Quests list
  questCount: document.getElementById('questCount'),
  typeFilter: document.getElementById('typeFilter'),
  showCompleted: document.getElementById('showCompleted'),
  questsMessage: document.getElementById('questsMessage'),
  questsContainer: document.getElementById('questsContainer'),
  emptyState: document.getElementById('emptyState')
};

// ---- Modules ----
const ui = initUI(elements, statsModule);
const auth = initAuth(supabase, ui);
const badges = initBadges(supabase);
const quests = initQuests(supabase, statsModule);

// ---- Helpers ----
async function getOrInitUserStats(userId) {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (error) throw error;
  if (data && data.length) return data[0];

  const { data: inserted, error: upsertError } = await supabase
    .from('user_stats')
    .upsert({ user_id: userId, xp: 0, coins: 0 }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (upsertError) throw upsertError;
  return inserted;
}

// ---- App init ----
async function initApp() {
  ui.showLoading();
  try {
    // show auth by default until we prove there is a valid session
    ui.showAuth(false);

    const user = await auth.checkSession();
    if (user) {
      const userStats = await getOrInitUserStats(user.id);
      statsModule.updateUserStats({
        xp: userStats.xp ?? 0,
        coins: userStats.coins ?? 0
      });

      ui.updateStatsDisplay();
      await ui.updateStreakDisplay(supabase, user.id);
      await quests.fetchQuests(user.id);
      
      // Load and display badges
      const allBadges = await badges.loadBadges();
      const userBadges = await badges.getUserBadges(user.id);
      ui.renderBadges(allBadges, userBadges);
      
      ui.updateUserInfo(user);
      ui.showDashboard();
      ui.renderQuests(quests.getQuests());
    }
  } catch (e) {
    console.error('Error initializing app:', e);
    // auth UI already visible
  } finally {
    ui.hideLoading();
  }
}

// ---- Events ----
document.addEventListener('DOMContentLoaded', () => {
  // Auth submit
  elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = elements.email.value.trim();
    const password = elements.password.value;

    if (!email || !password) {
      ui.showAuthMessage('Please fill in all fields', true);
      return;
    }

    ui.showLoading();
    try {
      const { isSignUp } = auth.getAuthState();
      let result;
      if (isSignUp) {
        const fullName = elements.fullName.value.trim();
        if (!fullName) {
          ui.showAuthMessage('Please enter your name', true);
          ui.hideLoading();
          return;
        }
        result = await auth.signUp(email, password, fullName);

        if (result.success && !result.user) {
          ui.showAuthMessage('Check your email to confirm your account, then sign in.', false);
          ui.showAuth(false); // switch to sign-in
          return;
        }
      } else {
        result = await auth.signIn(email, password);
      }

      if (result.success && result.user) {
        const userStats = await getOrInitUserStats(result.user.id);
        statsModule.updateUserStats({
          xp: userStats.xp ?? 0,
          coins: userStats.coins ?? 0
        });

        await quests.fetchQuests(result.user.id);
        
        // Load and display badges, check for new badges
        const allBadges = await badges.loadBadges();
        const userBadges = await badges.getUserBadges(result.user.id);
        const completedQuestsCount = await badges.getCompletedQuestsCount(result.user.id);
        const newBadges = await badges.checkAndAwardBadges(result.user.id, statsModule.getUserStats(), completedQuestsCount);
        
        // Show notifications for new badges
        newBadges.forEach(badge => badges.showBadgeNotification(badge));
        
        // Refresh badge display if new badges were earned
        if (newBadges.length > 0) {
          const updatedUserBadges = await badges.getUserBadges(result.user.id);
          ui.renderBadges(allBadges, updatedUserBadges);
        } else {
          ui.renderBadges(allBadges, userBadges);
        }
        
        ui.updateUserInfo(result.user);
        ui.updateStatsDisplay();
        await ui.updateStreakDisplay(supabase, result.user.id);
        ui.showDashboard();
        ui.renderQuests(quests.getQuests());
      } else {
        ui.showAuthMessage(result.error || 'Authentication failed', true);
      }
    } catch (err) {
      console.error('Auth error:', err);
      ui.showAuthMessage(err.message || 'Authentication failed', true);
    } finally {
      ui.hideLoading();
    }
  });

  // Toggle sign in / sign up
  elements.toggleBtn.addEventListener('click', () => {
    const isSignUp = auth.toggleAuthMode();
    ui.showAuth(isSignUp);
  });

  // Logout
  elements.logoutBtn?.addEventListener('click', async () => {
    await auth.signOut();
    ui.showAuth();
  });

  // Create quest
  elements.questForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = elements.questTitle.value.trim();
    const description = elements.questDescription.value.trim();
    const type = elements.questType.value;
    const dueDate = elements.questDueDate.value;

    if (!title) {
      ui.showQuestMessage('Please enter a quest title', true);
      return;
    }

    ui.showLoading();
    try {
      const { currentUser } = auth.getAuthState();
      if (!currentUser) {
        ui.showQuestMessage('You must be logged in to create quests', true);
        ui.hideLoading();
        return;
      }

      const questData = {
        title,
        description,
        type,
        due_date: dueDate || null
      };

      const result = await quests.createQuest(questData, currentUser.id);
      if (result.success) {
        ui.showQuestMessage('Quest created successfully');
        ui.clearQuestForm();
        ui.toggleQuestFormModal(false);
        ui.renderQuests(quests.getQuests(), elements.typeFilter.value, elements.showCompleted.checked);
      } else {
        ui.showQuestMessage(result.error || 'Failed to create quest', true);
      }
    } catch (err) {
      console.error('Create quest error:', err);
      ui.showQuestMessage('Failed to create quest', true);
    } finally {
      ui.hideLoading();
    }
  });

  // Filters & quest actions (delegated to ui)
  ui.initEventListeners({
    onFilter: (type, showCompleted) => {
      ui.renderQuests(quests.getQuests(), type, showCompleted);
    },
    onComplete: async (questId) => {
      ui.showLoading();
      try {
        const result = await quests.completeQuest(questId);
        if (result.success) {
          ui.updateStatsDisplay();
          const user = auth.getCurrentUser();
          if (user) {
            await ui.updateStreakDisplay(supabase, user.id);
            
            // Check for new badges after quest completion
            const completedQuestsCount = await badges.getCompletedQuestsCount(user.id);
            const newBadges = await badges.checkAndAwardBadges(user.id, statsModule.getUserStats(), completedQuestsCount);
            
            // Show notifications for new badges
            newBadges.forEach(badge => badges.showBadgeNotification(badge));
            
            // Update badge display if new badges were earned
            if (newBadges.length > 0) {
              const allBadges = await badges.loadBadges();
              const updatedUserBadges = await badges.getUserBadges(user.id);
              ui.renderBadges(allBadges, updatedUserBadges);
            }
          }
          ui.renderQuests(quests.getQuests(), elements.typeFilter.value, elements.showCompleted.checked);
          ui.showQuestMessage(`Quest completed! Earned ${result.rewards.xp} XP and ${result.rewards.coins} coins`);
        } else {
          ui.showQuestMessage(result.error || 'Failed to complete quest', true);
        }
      } catch (err) {
        console.error('Complete quest error:', err);
        ui.showQuestMessage('Failed to complete quest', true);
      } finally {
        ui.hideLoading();
      }
    },
    onDelete: async (questId) => {
      if (!confirm('Are you sure you want to delete this quest?')) return;
      ui.showLoading();
      try {
        const result = await quests.deleteQuest(questId);
        if (result.success) {
          ui.renderQuests(quests.getQuests(), elements.typeFilter.value, elements.showCompleted.checked);
          ui.showQuestMessage('Quest deleted successfully');
        } else {
          ui.showQuestMessage(result.error || 'Failed to delete quest', true);
        }
      } catch (err) {
        console.error('Delete quest error:', err);
        ui.showQuestMessage('Failed to delete quest', true);
      } finally {
        ui.hideLoading();
      }
    }
  });

  // Profile button event listeners
  elements.profileBtn?.addEventListener('click', async () => {
    const user = auth.getCurrentUser();
    if (!user) return;

    ui.showLoading();
    try {
      // Gather all profile data
      const userStats = statsModule.getUserStats();
      const allBadges = await badges.loadBadges();
      const userBadges = await badges.getUserBadges(user.id);
      
      // Get quest counts
      const questCounts = {
        total: await badges.getCompletedQuestsCount(user.id),
        weekly: await badges.getWeeklyCompletedQuestsCount(user.id),
        daily: quests.getQuests().filter(q => q.completed && q.type === 'daily').length,
        weeklyType: quests.getQuests().filter(q => q.completed && q.type === 'weekly').length
      };

      ui.updateProfileData(user, userStats, questCounts, allBadges, userBadges);
      ui.showProfile();
    } catch (err) {
      console.error('Profile load error:', err);
      ui.showQuestMessage('Failed to load profile', true);
    } finally {
      ui.hideLoading();
    }
  });

  elements.backToMainBtn?.addEventListener('click', () => {
    ui.hideProfile();
  });
});

// Kick off
initApp();