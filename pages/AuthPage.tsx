

import React, { useState } from 'react';
import { WandIcon } from '../components/icons';
import Loader from '../components/Loader';
import * as supabaseService from '../services/supabaseService';
import type { User, UserSettings } from '../types';

interface AuthPageProps {}

const AuthPage: React.FC<AuthPageProps> = () => {
    const [view, setView] = useState<'login' | 'signup' | 'forgot_password'>('login');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            if (view === 'login') {
                await supabaseService.logIn(formData.email, formData.password);
            } else { // signup
                const { hasSession } = await supabaseService.signUp(formData.name, formData.email, formData.password);
                 // If Supabase requires email confirmation, a session is not created immediately.
                if (!hasSession) {
                    setMessage('Check your email for a confirmation link!');
                    setFormData({ name: '', email: '', password: '' });
                    setView('login');
                    setIsLoading(false);
                    return;
                }
            }
            // On successful login or signup (with auto-confirmation),
            // the onAuthStateChange listener in App.tsx will handle setting the user state,
            // which will automatically unmount this component.
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        try {
            await supabaseService.sendPasswordResetEmail(formData.email);
            setMessage('Password reset link sent! Check your email.');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    const baseInputClass = "w-full px-4 py-3 rounded-lg bg-gray-100 border-transparent focus:border-primary focus:bg-white focus:ring-0 text-gray-800 dark:bg-slate-700 dark:text-gray-200";

    const renderContent = () => {
        if (view === 'forgot_password') {
            return (
                <>
                    <h2 className="text-2xl font-bold text-center text-text-primary dark:text-gray-200 mb-2">Reset Password</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Enter your email to get a reset link.</p>
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                            <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required className={baseInputClass} />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        {message && <p className="text-green-500 text-sm text-center">{message}</p>}
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:bg-primary/50 h-12">
                                {isLoading ? <Loader size="sm" /> : 'Send Reset Link'}
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-4">
                        <button onClick={() => { setView('login'); setError(''); setMessage(''); }} className="text-sm text-primary hover:underline">
                            Back to Log In
                        </button>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="flex border-b dark:border-slate-700 mb-6">
                    <button onClick={() => { setView('login'); setError(''); setMessage(''); }} className={`flex-1 py-3 font-semibold text-center transition-colors ${view === 'login' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                        Log In
                    </button>
                    <button onClick={() => { setView('signup'); setError(''); setMessage(''); }} className={`flex-1 py-3 font-semibold text-center transition-colors ${view === 'signup' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                        Sign Up
                    </button>
                </div>
                
                <h2 className="text-2xl font-bold text-center text-text-primary dark:text-gray-200 mb-2">{view === 'login' ? 'Welcome Back!' : 'Create an Account'}</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{view === 'login' ? 'Log in to access your hub.' : 'Get started in seconds.'}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {view === 'signup' && (
                        <div>
                            <input type="text" name="name" placeholder="Your Name" value={formData.name} onChange={handleChange} required className={baseInputClass} />
                        </div>
                    )}
                    <div>
                        <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required className={baseInputClass} />
                    </div>
                    <div>
                        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className={baseInputClass} />
                    </div>
                    
                    {view === 'login' && (
                         <div className="text-right text-sm">
                            <button type="button" onClick={() => { setView('forgot_password'); setError(''); setMessage(''); }} className="font-medium text-primary hover:underline">
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {message && <p className="text-green-500 text-sm text-center">{message}</p>}


                    <div>
                        <button type="submit" disabled={isLoading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:bg-primary/50 h-12">
                            {isLoading ? <Loader size="sm" /> : (view === 'login' ? 'Log In' : 'Sign Up')}
                        </button>
                    </div>
                </form>
            </>
        );
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary p-3 rounded-xl">
                    <WandIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100 font-poppins">
                    AI Content Hub
                </h1>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
                {renderContent()}
            </div>
        </div>
    );
};

export default AuthPage;