

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import AiChatModal from './components/AiChatModal';
import SplashScreen from './components/SplashScreen';
import * as supabaseService from './services/supabaseService';
import * as geminiService from './services/geminiService';
import type { ContentItem, User, UserSettings } from './types';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    setAuthLoading(true);
    // Get initial session state on page load
    supabaseService.getSession().then(({ user, userSettings }) => {
        setCurrentUser(user);
        setUserSettings(userSettings);
        setAuthLoading(false);
    }).catch(e => {
        console.error("Initial session check failed", e);
        setError("Could not connect to the backend. Please check your credentials and refresh.");
        setAuthLoading(false);
    });

    // Listen for auth state changes (login, logout, etc.)
    const subscription = supabaseService.onAuthStateChange((_event, session) => {
        if (session) {
            // User is signed in, fetch their profile and settings
            supabaseService.getUserProfileAndSettings(session.user)
                .then(({ user, userSettings }) => {
                    setCurrentUser(user);
                    setUserSettings(userSettings);
                })
                .catch(e => {
                    console.error("Failed to get user profile after auth change", e);
                    setError("Could not retrieve your profile. Please try refreshing.");
                });
        } else {
            // User is signed out
            setCurrentUser(null);
            setUserSettings(null);
            setContentItems([]); // Clear content on logout
        }
    });

    return () => {
        subscription.unsubscribe();
    };
}, []);
  
  useEffect(() => {
    if (!currentUser) return; // Don't fetch content if not logged in

    setIsLoading(true);
    const unsubscribe = supabaseService.subscribeToContentItems((items) => {
        setContentItems(items);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);
  
  useEffect(() => {
      if (userSettings?.theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [userSettings?.theme]);


  const handleAddItem = useCallback(async (itemData: any) => {
    try {
        const newItem = await supabaseService.addContentItem(itemData);

        // Run AI processing in the background without blocking the UI
        (async () => {
            try {
                let contentToAnalyze = { ...newItem };
                let transcription, summary;

                if (newItem.type === 'audio') {
                    const response = await fetch(newItem.content);
                    const blob = await response.blob();
                    const file = new File([blob], "audio." + newItem.mimeType.split('/')[1], { type: newItem.mimeType });
                    transcription = await geminiService.transcribeAudio(file);
                    // Prepare for text-based analysis
                    contentToAnalyze.content = transcription;
                    contentToAnalyze.type = 'text';
                } else if (newItem.type === 'url') {
                    summary = await geminiService.summarizeContent(newItem.content, 'url');
                    // Prepare for text-based analysis
                    contentToAnalyze.content = summary;
                    contentToAnalyze.type = 'text';
                }

                const { category, tags } = await geminiService.categorizeAndTagContent(contentToAnalyze);
                
                const updatedItem: Partial<ContentItem> & { id: string } = {
                    id: newItem.id,
                    category,
                    tags: [...(newItem.tags || []), ...tags].filter((v, i, a) => a.indexOf(v) === i), // Merge and remove duplicates
                };

                // Add transcription or summary if they were generated
                if (transcription) updatedItem.transcription = transcription;
                if (summary) updatedItem.summary = summary;
                
                await supabaseService.updateContentItem(updatedItem);

            } catch (aiError) {
                console.error("Background AI processing failed:", aiError);
                // Optionally: update the item with an error state to show in the UI
            }
        })();

    } catch (err) {
        console.error("Failed to add item:", err);
        setError("Could not add your content. Please try again.");
    }
  }, []);

  const handleUpdateItem = useCallback(async (item: Partial<ContentItem> & { id: string }) => {
    try {
        await supabaseService.updateContentItem(item);
    } catch (err) {
        console.error("Failed to update item:", err);
        setError("Could not update the content item.");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
        const items = await supabaseService.fetchContentItems();
        setContentItems(items);
    } catch (err) {
        console.error("Failed to refresh:", err);
        setError("Could not refresh your content. Please try again.");
    } finally {
        setIsLoading(false);
    }
  }, [currentUser]);

  const handleLogout = async () => {
      await supabaseService.logOut();
      // The onAuthStateChange listener will handle clearing user state
  };

  if (authLoading) {
      return <SplashScreen />;
  }

  if (!currentUser || !userSettings) {
      return <AuthPage />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage 
            contentItems={contentItems} 
            isLoading={isLoading} 
            error={error} 
            setError={setError}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem} 
            currentUser={currentUser}
            onRefresh={handleRefresh}
        />;
      case 'calendar':
        return <CalendarPage items={contentItems} onUpdateItem={handleUpdateItem} currentUser={currentUser} />;
      case 'settings':
        return <SettingsPage 
            user={currentUser}
            settings={userSettings}
            onUserUpdate={setCurrentUser}
            onSettingsUpdate={setUserSettings}
        />;
      default:
        return <DashboardPage 
            contentItems={contentItems} 
            isLoading={isLoading} 
            error={error} 
            setError={setError}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            currentUser={currentUser}
            onRefresh={handleRefresh}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 text-text-primary dark:text-gray-200 font-sans flex">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="flex-1 ml-64">
        {renderActivePage()}
      </div>
      <AiChatModal />
    </div>
  );
}

export default App;