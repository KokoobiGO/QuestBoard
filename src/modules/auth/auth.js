// auth.js - Handles authentication functionality

let currentUser = null;
let isSignUp = false;

function initAuth(supabase, ui) {
  async function checkSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      const user = data?.session?.user ?? null;
      currentUser = user;
      return user;
    } catch (e) {
      console.error('Error checking session:', e);
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

  // Keep local state synced with auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
  });

  return { checkSession, signUp, signIn, signOut, toggleAuthMode, getAuthState };
}

export { initAuth };
