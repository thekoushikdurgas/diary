
import React from 'react';
import { WandIcon } from './icons';
import Loader from './Loader';

const SplashScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-background dark:bg-slate-900 flex flex-col items-center justify-center transition-opacity duration-500">
            <div className="flex items-center gap-4 mb-6">
                <div className="bg-primary p-4 rounded-2xl animate-pulse">
                    <WandIcon className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-text-primary dark:text-gray-100 font-poppins">
                    AI Content Hub
                </h1>
            </div>
            <Loader size="md" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your creative space...</p>
        </div>
    );
};

export default SplashScreen;
