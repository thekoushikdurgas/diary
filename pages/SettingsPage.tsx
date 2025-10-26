
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import type { User, UserSettings } from '../types';
import * as supabaseService from '../services/supabaseService';
import Loader from '../components/Loader';

interface SettingsPageProps {
    user: User;
    settings: UserSettings;
    onUserUpdate: (user: User) => void;
    onSettingsUpdate: (settings: UserSettings) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, settings, onUserUpdate, onSettingsUpdate }) => {
    const [profileData, setProfileData] = useState({ name: user.name, email: user.email });
    const [preferences, setPreferences] = useState({ theme: settings.theme, notificationsEnabled: settings.notificationsEnabled });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [prefsMessage, setPrefsMessage] = useState('');

    useEffect(() => {
        const updateSettings = async () => {
            setIsSavingPrefs(true);
            try {
                const updatedSettings = await supabaseService.updateUserSettings(user.id, preferences);
                onSettingsUpdate(updatedSettings);
                setPrefsMessage('Preferences saved!');
            } catch (error) {
                console.error(error);
                setPrefsMessage('Failed to save preferences.');
            } finally {
                setIsSavingPrefs(false);
                setTimeout(() => setPrefsMessage(''), 2000);
            }
        };
        // Avoid running on initial render
        if (preferences.theme !== settings.theme || preferences.notificationsEnabled !== settings.notificationsEnabled) {
            updateSettings();
        }
    }, [preferences, settings.theme, settings.notificationsEnabled, user.id, onSettingsUpdate]);


    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileMessage('');
        try {
            const updatedUser = await supabaseService.updateUser(user.id, { name: profileData.name });
            onUserUpdate(updatedUser);
            setProfileMessage('Profile updated successfully!');
        } catch (error) {
            console.error(error);
            setProfileMessage('Failed to update profile.');
        } finally {
            setIsSavingProfile(false);
            setTimeout(() => setProfileMessage(''), 2000);
        }
    };

    return (
        <>
            <Header title="Settings" />
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
                {/* Profile Settings */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-text-primary dark:text-gray-100">Profile Information</h2>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                            <input type="text" name="name" id="name" value={profileData.name} onChange={handleProfileChange} className="mt-1 block w-full px-3 py-2 bg-transparent border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <input type="email" name="email" id="email" value={profileData.email} disabled className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm sm:text-sm text-gray-500" />
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="submit" disabled={isSavingProfile} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-primary/50">
                                {isSavingProfile ? <Loader size="xs" /> : 'Save Profile'}
                            </button>
                            {profileMessage && <p className="text-sm text-gray-600 dark:text-gray-300">{profileMessage}</p>}
                        </div>
                    </form>
                </div>

                {/* Preferences */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-text-primary dark:text-gray-100">Preferences</h2>
                    <div className="space-y-6">
                        {/* Theme Toggle */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Dark Mode</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Choose how AI Content Hub looks to you.</p>
                            <div className="mt-4">
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={preferences.theme === 'dark'} 
                                            onChange={e => setPreferences(p => ({...p, theme: e.target.checked ? 'dark' : 'light'}))}
                                        />
                                        <div className={`block w-14 h-8 rounded-full ${preferences.theme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                                    </div>
                                    <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
                                        {preferences.theme === 'dark' ? 'Enabled' : 'Disabled'}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Notification Toggle */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200">Notifications</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Enable or disable app notifications.</p>
                            <div className="mt-4">
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={preferences.notificationsEnabled} onChange={e => setPreferences(p => ({...p, notificationsEnabled: e.target.checked}))} />
                                        <div className={`block w-14 h-8 rounded-full ${preferences.notificationsEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                                    </div>
                                    <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
                                        {preferences.notificationsEnabled ? 'Enabled' : 'Disabled'}
                                    </div>
                                    <style>{`
                                        input:checked ~ .dot {
                                            transform: translateX(100%);
                                        }
                                    `}</style>
                                </label>
                            </div>
                        </div>
                        {prefsMessage && <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">{isSavingPrefs ? <Loader size="xs" /> : prefsMessage}</p>}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
