// auth.js - Handles authentication functionality

let currentUser = null;
let isSignUp = false;

function initAuth(supabase, ui) {
  async function updateLoginStreak(userId) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get current user stats
      const { data: userStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('current_streak, longest_streak, last_activity_date')
        .eq('user_id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching user stats for streak:', fetchError);
        return;
      }
      
      let newStreak = 1;
      let newLongestStreak = userStats?.longest_streak || 1;
      
      if (userStats?.last_activity_date) {
        const lastActivity = new Date(userStats.last_activity_date);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastActivity;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Same day, no streak change needed
          return;
        } else if (diffDays === 1) {
          // Consecutive day, increment streak
          newStreak = (userStats.current_streak || 0) + 1;
        } else {
          // Streak broken, reset to 1
          newStreak = 1;
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
          last_activity_date: today
        }, {
          onConflict: 'user_id'
        });
      
      if (updateError) {
        console.error('Error updating streak:', updateError);
      }
    } catch (e) {
      console.error('Error in updateLoginStreak:', e);
    }
  }

  async function checkSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        // If there's an error with the session (like invalid refresh token), clear it
        if (error.message?.includes('refresh') || error.message?.includes('token')) {
          await supabase.auth.signOut();
        }
        currentUser = null;
        return null;
      }
      const user = data?.session?.user ?? null;
      currentUser = user;
      return user;
    } catch (e) {
      console.error('Error checking session:', e);
      // Clear potentially corrupted session
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error clearing session:', signOutError);
      }
      currentUser = null;
      return null;
    }
  }

  async function signUp(email, password, fullName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;

      // If email confirmations are enabled, data.user exists but session may be null
      currentUser = data.user ?? null;
      return {
        success: true,
        user: data.user ?? null, // may be null until confirmed
        requiresConfirmation: !data.session
      };
    } catch (e) {
      console.error('Error signing up:', e);
      return { success: false, error: e.message };
    }
  }

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      
      // Update streak on successful login
      if (data.user) {
        await updateLoginStreak(data.user.id);
      }
      
      return { success: true, user: data.user };
    } catch (e) {
      console.error('Error signing in:', e);
      return { success: false, error: e.message };
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      currentUser = null;
      return { success: true };
    } catch (e) {
      console.error('Error signing out:', e);
      return { success: false, error: e.message };
    }
  }

  function toggleAuthMode() {
    isSignUp = !isSignUp;
    return isSignUp;
  }

  function getAuthState() {
    return { currentUser, isSignUp };
  }

  function getCurrentUser() {
    return currentUser;
  }

  // Keep local state synced with auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
  });

  return { checkSession, signUp, signIn, signOut, toggleAuthMode, getAuthState, getCurrentUser };
}

export { initAuth };
