// stats.js - Handles XP, coins, and level functionality

// Level thresholds - each index represents level, value is XP needed
const LEVEL_THRESHOLDS = [
    0,      // Level 0 (not used)
    0,      // Level 1 (0 XP)
    100,    // Level 2 (100 XP)
    250,    // Level 3 (250 XP)
    500,    // Level 4 (500 XP)
    1000,   // Level 5 (1000 XP)
    2000,   // Level 6 (2000 XP)
    3500,   // Level 7 (3500 XP)
    5500,   // Level 8 (5500 XP)
    8000,   // Level 9 (8000 XP)
    12000   // Level 10 (12000 XP)
];

// Initialize user stats
let userStats = { xp: 0, coins: 0 };

/**
 * Calculate the current level based on XP
 * @param {number} xp - Current XP amount
 * @returns {number} - Current level
 */
function calculateLevel(xp) {
    let level = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            level = i;
        } else {
            break;
        }
    }
    return level;
}

/**
 * Calculate XP progress to next level as percentage
 * @param {number} xp - Current XP amount
 * @param {number} level - Current level
 * @returns {number} - Progress percentage (0-100)
 */
function calculateXpProgress(xp, level) {
    if (level >= LEVEL_THRESHOLDS.length - 1) {
        return 100; // Max level reached
    }
    
    const currentLevelXp = LEVEL_THRESHOLDS[level];
    const nextLevelXp = LEVEL_THRESHOLDS[level + 1];
    const xpForCurrentLevel = xp - currentLevelXp;
    const xpRequiredForNextLevel = nextLevelXp - currentLevelXp;
    
    return Math.floor((xpForCurrentLevel / xpRequiredForNextLevel) * 100);
}

/**
 * Update user stats with new values
 * @param {Object} stats - New stats object with xp, coins, level
 */
function updateUserStats(stats) {
    userStats = { ...userStats, ...stats };
    
    // Recalculate level if XP changed
    if (stats.xp !== undefined) {
        userStats.level = calculateLevel(userStats.xp);
    }
    
    return userStats;
}

/**
 * Get current user stats
 * @returns {Object} - User stats object
 */
function getUserStats() {
    return userStats;
}

/**
 * Add XP to user stats
 * @param {number} amount - Amount of XP to add
 * @returns {Object} - Updated user stats
 */
function addXp(amount) {
    userStats.xp += amount;
    userStats.level = calculateLevel(userStats.xp);
    return userStats;
}

/**
 * Add coins to user stats
 * @param {number} amount - Amount of coins to add
 * @returns {Object} - Updated user stats
 */
function addCoins(amount) {
    userStats.coins += amount;
    return userStats;
}

export {
    LEVEL_THRESHOLDS,
    calculateLevel,
    calculateXpProgress,
    updateUserStats,
    getUserStats,
    addXp,
    addCoins
};