

import { createClient, User as SupabaseUser, Session, Subscription } from '@supabase/supabase-js';
import type { ContentItem, User, UserSettings } from '../types';

const SUPABASE_URL="https://woqnlgszvkqxaqabtqfv.supabase.co"
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcW5sZ3N6dmtxeGFxYWJ0cWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTM4ODYsImV4cCI6MjA3Njg4OTg4Nn0.DpePQML323-gdbbPxidrq-up8PXeBdXlG_8AtcIMW0o"


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Helper to get user ID ---
const getUserId = async (): Promise<string> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) throw new Error("User not authenticated.");
    return session.user.id;
}

const mapSupabaseUserToAppUser = (supabaseUser: SupabaseUser, profile: any): User => {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile?.name || 'New User',
    };
};

// --- Auth API ---
export const signUp = async (name: string, email: string, password: string): Promise<{ hasSession: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name } // Pass name to be used in the trigger
        }
    });
    if (error) throw error;
    return { hasSession: !!data.session };
};

export const logIn = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Log in failed, no user returned.");
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    return mapSupabaseUserToAppUser(data.user, profile);
};

export const logOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });
    if (error) throw error;
};

export const getUserProfileAndSettings = async (supabaseUser: SupabaseUser): Promise<{ user: User; userSettings: UserSettings }> => {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).single();
    if (profileError) throw profileError;

    const { data: settings, error: settingsError } = await supabase.from('user_settings').select('*').eq('user_id', supabaseUser.id).single();
    
    // Gracefully handle case where settings don't exist yet for a new user.
    if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
    }

    const user = mapSupabaseUserToAppUser(supabaseUser, profile);
    const userSettings: UserSettings = {
        theme: settings?.theme || 'light',
        notificationsEnabled: settings?.notifications_enabled ?? true,
    };
    
    return { user, userSettings };
}

export const getSession = async (): Promise<{ user: User | null; userSettings: UserSettings | null }> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) return { user: null, userSettings: null };
    return getUserProfileAndSettings(session.user);
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void): Subscription => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
};


// --- User Profile & Settings API ---
export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
    const { data, error } = await supabase.from('profiles').update({ name: updates.name }).eq('id', userId).select().single();
    if (error) throw error;
    const sessionUser = (await supabase.auth.getUser()).data.user;
    if (!sessionUser) throw new Error("User not found");
    return mapSupabaseUserToAppUser(sessionUser, data);
};

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>): Promise<UserSettings> => {
    const { data, error } = await supabase.from('user_settings')
        .update({ theme: updates.theme, notifications_enabled: updates.notificationsEnabled })
        .eq('user_id', userId)
        .select()
        .single();
    if (error) throw error;
    return { theme: data.theme, notificationsEnabled: data.notifications_enabled };
};

// --- Content API ---

// Maps DB snake_case to JS camelCase
const fromSupabase = (item: any): ContentItem => {
    if (!item) return item;
    const { created_at, ai_analysis, mime_type, ...rest } = item;
    return {
        ...rest,
        createdAt: created_at,
        aiAnalysis: ai_analysis,
        mimeType: mime_type,
    } as ContentItem;
};

// Maps JS camelCase to DB snake_case
const toSupabase = (item: any): any => {
    if (!item) return item;
    const { createdAt, aiAnalysis, mimeType, ...rest } = item;
    const supabaseItem: any = { ...rest };
    // Only add properties if they are not undefined to avoid overwriting with null
    if (createdAt !== undefined) supabaseItem.created_at = createdAt;
    if (aiAnalysis !== undefined) supabaseItem.ai_analysis = aiAnalysis;
    if (mimeType !== undefined) supabaseItem.mime_type = mimeType;
    return supabaseItem;
};

export const fetchContentItems = async (): Promise<ContentItem[]> => {
    const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(fromSupabase);
};

export const addContentItem = async (item: Omit<ContentItem, 'id' | 'createdAt'>): Promise<ContentItem> => {
    const userId = await getUserId();
    const itemToAdd = { ...toSupabase(item), user_id: userId };
    
    const { data, error } = await supabase
        .from('content_items')
        .insert(itemToAdd)
        .select()
        .single();
        
    if (error) throw error;
    return fromSupabase(data);
};

export const updateContentItem = async (updatedItem: Partial<ContentItem> & {id: string}): Promise<ContentItem> => {
    const { id, ...updateData } = updatedItem;
    const itemToUpdate = toSupabase(updateData);

    const { data, error } = await supabase
        .from('content_items')
        .update(itemToUpdate)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return fromSupabase(data);
};

export const updateMultipleContentItems = async (updates: (Partial<ContentItem> & { id: string })[]): Promise<void> => {
    const updatesForSupabase = updates.map(item => toSupabase(item));
    const { error } = await supabase.from('content_items').upsert(updatesForSupabase);
    if (error) throw error;
};


// --- Real-time Subscriptions ---
export const subscribeToContentItems = (callback: (items: ContentItem[]) => void): (() => void) => {
    // Initial fetch
    fetchContentItems().then(callback);

    const channel = supabase
        .channel('public:content_items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' },
            () => {
                // On any change, re-fetch all items to ensure UI consistency
                fetchContentItems().then(callback);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Functions below are no longer needed with a real backend
export const startViewingItem = async (itemId: string, userName: string): Promise<void> => { /* no-op */ };
export const stopViewingItem = async (itemId: string, userName: string): Promise<void> => { /* no-op */ };