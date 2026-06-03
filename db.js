// ==========================================
// RECESS WELLNESS PLANNER - DATABASE SERVICE
// ==========================================

// If you want to connect your live Supabase database, replace these placeholder values:
const SUPABASE_URL = 'https://vsaisoypetryybkypvuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWlzb3lwZXRyeXlia3lwdnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODI5ODgsImV4cCI6MjA5NTk1ODk4OH0.ZWJ-fZf8vUEX9rjtQ5tAx_Zv686E8H0zCMpx3uquzEE';

// Initialize Supabase Client if keys are provided
let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Recess: Supabase Cloud Client Initialized successfully! 🌸');
  } else {
    console.log('Recess: Running in local sandbox mode (using localStorage) 📦');
  }
} catch (e) {
  console.error('Recess: Error initializing Supabase client', e);
}

// Check if Supabase is active
const isCloud = () => !!supabaseClient;

// Standard Seed Data for New Users (Default Trackers)
const DEFAULT_TRACKERS = [
  { id: 't-water', name: 'Water Intake', icon: '💧', color: 'blue', type: 'numeric', order_index: 0, is_default: true },
  { id: 't-sleep', name: 'Sleep Hours', icon: '😴', color: 'lavender', type: 'numeric', order_index: 1, is_default: true },
  { id: 't-workout', name: 'Workout', icon: '💪', color: 'pink', type: 'checkbox', order_index: 2, is_default: true },
  { id: 't-steps', name: 'Step Tracking', icon: '🚶', color: 'green', type: 'numeric', order_index: 3, is_default: true },
  { id: 't-protein', name: 'Protein Intake', icon: '🥗', color: 'cream', type: 'numeric', order_index: 4, is_default: true },
  { id: 't-skincare', name: 'Skincare', icon: '🧴', color: 'pink', type: 'checkbox', order_index: 5, is_default: true },
  { id: 't-supplements', name: 'Supplements', icon: '💊', color: 'blue', type: 'checkbox', order_index: 6, is_default: true },
  { id: 't-todo', name: 'To Do List', icon: '📝', color: 'lavender', type: 'text', order_index: 7, is_default: true }
];

// Pre-seeded Demo Data for Guests
const DEMO_DATA = {
  profile: {
    name: 'Sarah',
    theme: 'light',
    menstrual_cycle_enabled: true,
  },
  trackers: DEFAULT_TRACKERS,
  notes: [
    { date: '2026-06-01', content: 'Lovely morning! Went for a jog and completed skincare routine. Lunch was avocado toast + poached eggs.' },
    { date: '2026-05-31', content: 'Feeling productive today. Read 15 pages and slept early! Meditated for 10 minutes before sleeping.' }
  ],
  logs: [
    { date: '2026-06-01', tracker_key: 't-water', value: '8' },
    { date: '2026-06-01', tracker_key: 't-sleep', value: '7.5' },
    { date: '2026-06-01', tracker_key: 't-workout', value: 'true' },
    { date: '2026-06-01', tracker_key: 't-steps', value: '9400' },
    { date: '2026-06-01', tracker_key: 't-skincare', value: 'true' },

    { date: '2026-05-31', tracker_key: 't-water', value: '6' },
    { date: '2026-05-31', tracker_key: 't-sleep', value: '8.2' },
    { date: '2026-05-31', tracker_key: 't-steps', value: '4500' },
    { date: '2026-05-31', tracker_key: 't-skincare', value: 'true' }
  ],
  cycleLogs: [
    { date: '2026-06-01', is_period: true, flow_level: 'medium', mood: 'calm', energy_level: 'medium', symptoms: ['Cramps'] },
    { date: '2026-05-31', is_period: true, flow_level: 'light', mood: 'sensitive', energy_level: 'low', symptoms: ['Headache'] }
  ],
  goals: [
    { id: 'g1', title: 'Complete monthly wellness journal', type: 'monthly', completed: false },
    { id: 'g2', title: 'Drink 8 cups of water daily', type: 'daily', completed: true },
    { id: 'g3', title: 'Sleep at least 7.5 hours avg', type: 'weekly', completed: false }
  ]
};

// ----------------------------------------------------
// LOCAL STORAGE SIMULATOR HELPER METHODS
// ----------------------------------------------------
const getLocal = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}`, e);
    return defaultValue;
  }
};

const setLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
};

// Keys mappings
const KEYS = {
  USERS: 'recess_users_list',
  PROFILES: 'recess_profiles_list',
  NOTES: 'recess_notes_list',
  TRACKERS: 'recess_trackers_list',
  LOGS: 'recess_logs_list',
  CYCLE: 'recess_cycle_list',
  GOALS: 'recess_goals_list'
};

// ----------------------------------------------------
// UNIFIED DATA SERVICE INTERFACE
// ----------------------------------------------------
window.db = {
  isCloudMode: () => isCloud(),
  getDemoData: () => DEMO_DATA,
  _localOtps: {},

  // ----------------------------------------------------
  // AUTHENTICATION CONTROLLERS
  // ----------------------------------------------------
  async getCurrentUser() {
    if (isCloud()) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        const user = session.user;
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || 'User';
        const email = user.email || meta.email || '';
        const avatarUrl = meta.avatar_url || meta.picture || null;

        let profile = null;
        try {
          const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
          if (error) {
            if (error.code === 'PGRST116') {
              profile = await this.createProfile(user.id, fullName, email, avatarUrl);
            } else {
              throw error;
            }
          } else {
            profile = data;
            // Sync columns if they exist and are missing
            let needsUpdate = false;
            const updatePayload = {};
            if (!profile.name && fullName) {
              updatePayload.name = fullName;
              needsUpdate = true;
            }
            if (profile.hasOwnProperty('email') && !profile.email && email) {
              updatePayload.email = email;
              needsUpdate = true;
            }
            if (profile.hasOwnProperty('avatar_url') && !profile.avatar_url && avatarUrl) {
              updatePayload.avatar_url = avatarUrl;
              needsUpdate = true;
            }
            if (needsUpdate) {
              const { data: updatedData } = await supabaseClient.from('profiles').update(updatePayload).eq('id', user.id).select().single();
              if (updatedData) profile = updatedData;
            }
          }
        } catch (e) {
          console.error('Recess: Error syncing profile from Google Metadata', e);
        }

        return {
          id: user.id,
          email: email,
          name: profile?.name || fullName,
          avatar_url: profile?.avatar_url || avatarUrl,
          theme: profile?.theme || 'light',
          menstrual_cycle_enabled: profile?.menstrual_cycle_enabled || false
        };
      }
      return null;
    } else {
      const session = localStorage.getItem('recess_active_session');
      return session ? JSON.parse(session) : null;
    }
  },

  async signUp(email, password, name) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data?.user) {
        await this.createProfile(data.user.id, name);
      }
      return data.user;
    } else {
      const users = getLocal(KEYS.USERS, []);
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
      }

      const userId = crypto.randomUUID();
      const newUser = { id: userId, email, password, name };
      users.push(newUser);
      setLocal(KEYS.USERS, users);

      const profile = await this.createProfile(userId, name);
      const sessionUser = {
        id: userId,
        email,
        name,
        theme: profile.theme,
        menstrual_cycle_enabled: profile.menstrual_cycle_enabled
      };

      localStorage.setItem('recess_active_session', JSON.stringify(sessionUser));
      return sessionUser;
    }
  },

  async signIn(email, password) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        const profile = await this.getProfile(data.user.id);
        return {
          id: data.user.id,
          email: data.user.email,
          name: profile?.name || 'User',
          theme: profile?.theme || 'light',
          menstrual_cycle_enabled: profile?.menstrual_cycle_enabled || false
        };
      }
      throw new Error('Failed loading user session.');
    } else {
      const users = getLocal(KEYS.USERS, []);
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!matched) throw new Error('Invalid email or password.');

      const profile = await this.getProfile(matched.id);
      const sessionUser = {
        id: matched.id,
        email: matched.email,
        name: profile.name || matched.name,
        theme: profile.theme,
        menstrual_cycle_enabled: profile.menstrual_cycle_enabled
      };

      localStorage.setItem('recess_active_session', JSON.stringify(sessionUser));
      return sessionUser;
    }
  },

  async signInWithGoogle() {
    if (!isCloud()) {
      throw new Error('Supabase is not configured. Google OAuth requires a valid Supabase project URL and API key in db.js.');
    }
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (isCloud()) {
      await supabaseClient.auth.signOut();
    } else {
      localStorage.removeItem('recess_active_session');
    }
    window.location.reload();
  },

  async resetPassword(email) {
    if (isCloud()) {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return true;
    } else {
      console.log(`Password reset mock link sent to: ${email}`);
      return true;
    }
  },

  async updatePassword(userId, newPassword) {
    if (isCloud()) {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    } else {
      const users = getLocal(KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === userId);
      if (idx >= 0) {
        users[idx].password = newPassword;
        setLocal(KEYS.USERS, users);
        return true;
      }
      throw new Error('User account not found.');
    }
  },

  async deleteAccount(userId) {
    await this.deleteUserData(userId);
    if (isCloud()) {
      await supabaseClient.from('profiles').delete().eq('id', userId);
      await supabaseClient.auth.signOut();
    } else {
      const users = getLocal(KEYS.USERS, []);
      const filtered = users.filter(u => u.id !== userId);
      setLocal(KEYS.USERS, filtered);
      localStorage.removeItem('recess_active_session');
    }
    window.location.reload();
  },

  async sendPasswordResetOtp(email) {
    if (isCloud()) {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return true;
    } else {
      const users = getLocal(KEYS.USERS, []);
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) {
        throw new Error('No account found with this email address.');
      }
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      this._localOtps[email.toLowerCase()] = otp;
      console.log(`[Recess MOCK OTP] Password reset OTP for ${email}: ${otp}`);
      return otp;
    }
  },

  async verifyPasswordResetOtp(email, token) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });
      if (error) throw error;
      return data.user.id;
    } else {
      const storedOtp = this._localOtps[email.toLowerCase()];
      if (!storedOtp || storedOtp !== token) {
        throw new Error('Invalid OTP code. Please try again.');
      }
      const users = getLocal(KEYS.USERS, []);
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!matched) throw new Error('User not found.');
      delete this._localOtps[email.toLowerCase()];
      return matched.id;
    }
  },

  // ----------------------------------------------------
  // PROFILES / USER SETTINGS
  // ----------------------------------------------------
  async getProfile(userId) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
      if (error) {
        if (error.code === 'PGRST116') {
          return this.createProfile(userId, 'User');
        }
        throw error;
      }
      return data;
    } else {
      const profiles = getLocal(KEYS.PROFILES, {});
      if (!profiles[userId]) {
        profiles[userId] = {
          id: userId,
          name: 'Sarah',
          theme: 'light',
          menstrual_cycle_enabled: true,
          notifications_daily: false,
          notifications_weekly: false,
          created_at: new Date().toISOString()
        };
        setLocal(KEYS.PROFILES, profiles);
      }
      return profiles[userId];
    }
  },

  async createProfile(userId, name, email = null, avatarUrl = null) {
    const defaultProfile = {
      id: userId,
      name: name || 'User',
      theme: 'light',
      menstrual_cycle_enabled: true,
      notifications_daily: false,
      notifications_weekly: false,
      created_at: new Date().toISOString()
    };

    if (isCloud()) {
      try {
        const fullProfile = { ...defaultProfile };
        if (email) fullProfile.email = email;
        if (avatarUrl) fullProfile.avatar_url = avatarUrl;

        const { data, error } = await supabaseClient.from('profiles').insert([fullProfile]).select().single();
        if (error) throw error;
        await this.seedDefaultTrackers(userId);
        return data;
      } catch (err) {
        // Fallback in case columns do not exist yet on the remote profiles table schema
        const { data, error } = await supabaseClient.from('profiles').insert([defaultProfile]).select().single();
        if (error) throw error;
        await this.seedDefaultTrackers(userId);
        return data;
      }
    } else {
      const profiles = getLocal(KEYS.PROFILES, {});
      const localProfile = { ...defaultProfile };
      if (email) localProfile.email = email;
      if (avatarUrl) localProfile.avatar_url = avatarUrl;
      profiles[userId] = localProfile;
      setLocal(KEYS.PROFILES, profiles);

      // Seed trackers locally
      const trackers = getLocal(KEYS.TRACKERS, []);
      const exists = trackers.some(t => t.user_id === userId);
      if (!exists) {
        const userDefaults = DEFAULT_TRACKERS.map(t => ({ ...t, id: `t-${t.id}-${userId}`, user_id: userId }));
        setLocal(KEYS.TRACKERS, [...trackers, ...userDefaults]);
      }
      return localProfile;
    }
  },

  async updateProfile(userId, profileData) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('profiles').update(profileData).eq('id', userId).select().single();
      if (error) throw error;
      return data;
    } else {
      const profiles = getLocal(KEYS.PROFILES, {});
      profiles[userId] = { ...profiles[userId], ...profileData };
      setLocal(KEYS.PROFILES, profiles);

      // Update active session locally
      const activeSession = localStorage.getItem('recess_active_session');
      if (activeSession) {
        const sessionUser = JSON.parse(activeSession);
        if (sessionUser.id === userId) {
          const next = { ...sessionUser, ...profileData };
          localStorage.setItem('recess_active_session', JSON.stringify(next));
        }
      }
      return profiles[userId];
    }
  },

  // ----------------------------------------------------
  // NOTES / DIARY ENTRIES
  // ----------------------------------------------------
  async getNotes(userId) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('notes').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    } else {
      const notes = getLocal(KEYS.NOTES, []);
      return notes.filter(n => n.user_id === userId);
    }
  },

  async saveNote(userId, date, content) {
    if (isCloud()) {
      const { data, error } = await supabaseClient
        .from('notes')
        .upsert({ user_id: userId, date, content }, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const notes = getLocal(KEYS.NOTES, []);
      const idx = notes.findIndex(n => n.user_id === userId && n.date === date);
      const updated = { id: idx >= 0 ? notes[idx].id : crypto.randomUUID(), user_id: userId, date, content, created_at: new Date().toISOString() };

      if (idx >= 0) {
        notes[idx] = updated;
      } else {
        notes.push(updated);
      }
      setLocal(KEYS.NOTES, notes);
      return updated;
    }
  },

  async deleteNote(userId, date) {
    if (isCloud()) {
      const { error } = await supabaseClient.from('notes').delete().eq('user_id', userId).eq('date', date);
      if (error) throw error;
      return true;
    } else {
      const notes = getLocal(KEYS.NOTES, []);
      const filtered = notes.filter(n => !(n.user_id === userId && n.date === date));
      setLocal(KEYS.NOTES, filtered);
      return true;
    }
  },

  // ----------------------------------------------------
  // TRACKERS SETUP
  // ----------------------------------------------------
  async getTrackers(userId) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('custom_trackers').select('*').eq('user_id', userId).order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      const trackers = getLocal(KEYS.TRACKERS, []);
      const userTrackers = trackers.filter(t => t.user_id === userId);
      if (userTrackers.length === 0) {
        const userDefaults = DEFAULT_TRACKERS.map(t => ({ ...t, user_id: userId }));
        setLocal(KEYS.TRACKERS, [...trackers, ...userDefaults]);
        return userDefaults;
      }
      return userTrackers.sort((a, b) => a.order_index - b.order_index);
    }
  },

  async seedDefaultTrackers(userId) {
    const userDefaults = DEFAULT_TRACKERS.map(t => ({
      user_id: userId,
      name: t.name,
      icon: t.icon,
      color: t.color,
      type: t.type,
      order_index: t.order_index
    }));
    await supabaseClient.from('custom_trackers').insert(userDefaults);
  },

  async createTracker(userId, trackerData) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('custom_trackers').insert([{ ...trackerData, user_id: userId }]).select().single();
      if (error) throw error;
      return data;
    } else {
      const trackers = getLocal(KEYS.TRACKERS, []);
      const newTracker = {
        id: crypto.randomUUID(),
        user_id: userId,
        ...trackerData,
        created_at: new Date().toISOString()
      };
      trackers.push(newTracker);
      setLocal(KEYS.TRACKERS, trackers);
      return newTracker;
    }
  },

  async updateTracker(userId, trackerId, trackerData) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('custom_trackers').update(trackerData).eq('id', trackerId).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    } else {
      const trackers = getLocal(KEYS.TRACKERS, []);
      const idx = trackers.findIndex(t => t.id === trackerId && t.user_id === userId);
      if (idx >= 0) {
        trackers[idx] = { ...trackers[idx], ...trackerData };
        setLocal(KEYS.TRACKERS, trackers);
        return trackers[idx];
      }
      throw new Error('Tracker not found');
    }
  },

  async deleteTracker(userId, trackerId) {
    if (isCloud()) {
      await supabaseClient.from('custom_trackers').delete().eq('id', trackerId).eq('user_id', userId);
      return true;
    } else {
      const trackers = getLocal(KEYS.TRACKERS, []);
      const filtered = trackers.filter(t => !(t.id === trackerId && t.user_id === userId));
      setLocal(KEYS.TRACKERS, filtered);

      // Delete tracker logs
      const logs = getLocal(KEYS.LOGS, []);
      const filteredLogs = logs.filter(l => !(l.user_id === userId && l.tracker_key === trackerId));
      setLocal(KEYS.LOGS, filteredLogs);
      return true;
    }
  },

  async saveTrackerOrder(userId, orderedTrackerIds) {
    if (isCloud()) {
      for (let i = 0; i < orderedTrackerIds.length; i++) {
        await supabaseClient.from('custom_trackers').update({ order_index: i }).eq('id', orderedTrackerIds[i]).eq('user_id', userId);
      }
      return true;
    } else {
      const trackers = getLocal(KEYS.TRACKERS, []);
      const updated = trackers.map(t => {
        if (t.user_id === userId) {
          const idx = orderedTrackerIds.indexOf(t.id);
          if (idx !== -1) {
            return { ...t, order_index: idx };
          }
        }
        return t;
      });
      setLocal(KEYS.TRACKERS, updated);
      return true;
    }
  },

  // ----------------------------------------------------
  // TRACKER LOGS / ENTRIES
  // ----------------------------------------------------
  async getLogs(userId) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('tracker_logs').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    } else {
      const logs = getLocal(KEYS.LOGS, []);
      return logs.filter(l => l.user_id === userId);
    }
  },

  async saveLog(userId, date, trackerKey, value) {
    if (isCloud()) {
      const { data, error } = await supabaseClient
        .from('tracker_logs')
        .upsert({ user_id: userId, date, tracker_key: trackerKey, value: String(value) }, { onConflict: 'user_id,date,tracker_key' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const logs = getLocal(KEYS.LOGS, []);
      const idx = logs.findIndex(l => l.user_id === userId && l.date === date && l.tracker_key === trackerKey);
      const updated = {
        id: idx >= 0 ? logs[idx].id : crypto.randomUUID(),
        user_id: userId,
        date,
        tracker_key: trackerKey,
        value: String(value),
        created_at: new Date().toISOString()
      };

      if (idx >= 0) {
        logs[idx] = updated;
      } else {
        logs.push(updated);
      }
      setLocal(KEYS.LOGS, logs);
      return updated;
    }
  },

  // ----------------------------------------------------
  // MENSTRUAL CYCLE LOGS
  // ----------------------------------------------------
  async getCycleLogs(userId) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('cycle_logs').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    } else {
      const logs = getLocal(KEYS.CYCLE, []);
      return logs.filter(c => c.user_id === userId);
    }
  },

  async saveCycleLog(userId, date, cycleData) {
    if (isCloud()) {
      const { data, error } = await supabaseClient
        .from('cycle_logs')
        .upsert({
          user_id: userId,
          date,
          is_period: cycleData.is_period,
          flow_level: cycleData.flow_level || null,
          mood: cycleData.mood || null,
          energy_level: cycleData.energy_level || null,
          symptoms: cycleData.symptoms || []
        }, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const logs = getLocal(KEYS.CYCLE, []);
      const idx = logs.findIndex(c => c.user_id === userId && c.date === date);
      const updated = {
        id: idx >= 0 ? logs[idx].id : crypto.randomUUID(),
        user_id: userId,
        date,
        is_period: cycleData.is_period,
        flow_level: cycleData.flow_level || null,
        mood: cycleData.mood || null,
        energy_level: cycleData.energy_level || null,
        symptoms: cycleData.symptoms || [],
        created_at: new Date().toISOString()
      };

      if (idx >= 0) {
        logs[idx] = updated;
      } else {
        logs.push(updated);
      }
      setLocal(KEYS.CYCLE, logs);
      return updated;
    }
  },

  // ----------------------------------------------------
  // GOALS SECTION
  // ----------------------------------------------------
  async getGoals(userId) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('goals').select('*').eq('user_id', userId);
      if (error) throw error;
      return data;
    } else {
      const goals = getLocal(KEYS.GOALS, []);
      return goals.filter(g => g.user_id === userId);
    }
  },

  async createGoal(userId, goalData) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('goals').insert([{ ...goalData, user_id: userId, completed: false }]).select().single();
      if (error) throw error;
      return data;
    } else {
      const goals = getLocal(KEYS.GOALS, []);
      const newGoal = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: goalData.title,
        type: goalData.type,
        completed: false,
        due_date: goalData.due_date || null,
        created_at: new Date().toISOString()
      };
      goals.push(newGoal);
      setLocal(KEYS.GOALS, goals);
      return newGoal;
    }
  },

  async updateGoal(userId, goalId, goalData) {
    if (isCloud()) {
      const { data, error } = await supabaseClient.from('goals').update(goalData).eq('id', goalId).eq('user_id', userId).select().single();
      if (error) throw error;
      return data;
    } else {
      const goals = getLocal(KEYS.GOALS, []);
      const idx = goals.findIndex(g => g.id === goalId && g.user_id === userId);
      if (idx >= 0) {
        goals[idx] = { ...goals[idx], ...goalData };
        setLocal(KEYS.GOALS, goals);
        return goals[idx];
      }
      throw new Error('Goal not found');
    }
  },

  async deleteGoal(userId, goalId) {
    if (isCloud()) {
      await supabaseClient.from('goals').delete().eq('id', goalId).eq('user_id', userId);
      return true;
    } else {
      const goals = getLocal(KEYS.GOALS, []);
      const filtered = goals.filter(g => !(g.id === goalId && g.user_id === userId));
      setLocal(KEYS.GOALS, filtered);
      return true;
    }
  },

  // ----------------------------------------------------
  // DATA ACTIONS & EXPORTS
  // ----------------------------------------------------
  async exportUserData(userId) {
    const profile = await this.getProfile(userId);
    const notes = await this.getNotes(userId);
    const trackers = await this.getTrackers(userId);
    const logs = await this.getLogs(userId);
    const cycleLogs = await this.getCycleLogs(userId);
    const goals = await this.getGoals(userId);

    return {
      export_version: '1.0',
      export_date: new Date().toISOString(),
      user_id: userId,
      profile,
      notes,
      trackers,
      logs,
      cycleLogs,
      goals
    };
  },

  async deleteUserData(userId) {
    if (isCloud()) {
      await supabaseClient.from('profiles').delete().eq('id', userId);
    } else {
      const profiles = getLocal(KEYS.PROFILES, {});
      delete profiles[userId];
      setLocal(KEYS.PROFILES, profiles);

      const filterUser = (key) => {
        const list = getLocal(key, []);
        const filtered = list.filter(item => item.user_id !== userId);
        setLocal(key, filtered);
      };

      filterUser(KEYS.NOTES);
      filterUser(KEYS.TRACKERS);
      filterUser(KEYS.LOGS);
      filterUser(KEYS.CYCLE);
      filterUser(KEYS.GOALS);
    }
    return true;
  }
};
