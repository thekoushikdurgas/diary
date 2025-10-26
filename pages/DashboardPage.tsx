import React, { useState, useMemo, useCallback } from 'react';
import Header from '../components/Header';
import ContentGrid from '../components/ContentGrid';
import AddContentForm from '../components/AddContentForm';
import Loader from '../components/Loader';
import FilterBar from '../components/FilterBar';
import type { ContentItem, ActiveFilters, User } from '../types';
import * as geminiService from '../services/geminiService';
import * as supabaseService from '../services/supabaseService';
import { MagnifyingGlassIcon } from '../components/icons';


interface DashboardPageProps {
    contentItems: ContentItem[];
    isLoading: boolean;
    error: string;
    setError: (error: string) => void;
    onAddItem: (itemData: any) => Promise<void>;
    onUpdateItem: (item: Partial<ContentItem> & { id: string }) => Promise<void>;
    currentUser: User;
    onRefresh: () => Promise<void>;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ contentItems, isLoading, error, setError, onAddItem, onUpdateItem, currentUser, onRefresh }) => {
    const [isOrganizing, setIsOrganizing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [filters, setFilters] = useState<ActiveFilters>({ types: [], categories: [], tags: [], priorities: [] });

    const filteredItems = useMemo(() => {
        let items = contentItems.filter(item => {
            const lowercasedTerm = searchTerm.toLowerCase();
            const searchMatch = lowercasedTerm === '' ||
                item.content?.toLowerCase().includes(lowercasedTerm) ||
                item.summary?.toLowerCase().includes(lowercasedTerm) ||
                item.aiAnalysis?.toLowerCase().includes(lowercasedTerm) ||
                item.transcription?.toLowerCase().includes(lowercasedTerm) ||
                item.tags?.some(tag => tag.toLowerCase().includes(lowercasedTerm)) ||
                item.category?.toLowerCase().includes(lowercasedTerm);

            const typeMatch = filters.types.length === 0 || filters.types.includes(item.type.replace('_', ' '));
            const categoryMatch = filters.categories.length === 0 || (item.category && filters.categories.includes(item.category));
            const tagMatch = filters.tags.length === 0 || (item.tags && filters.tags.every(tag => item.tags?.includes(tag)));
            const priorityMatch = filters.priorities.length === 0 || (item.priority && filters.priorities.includes(item.priority));
            
            return searchMatch && typeMatch && categoryMatch && tagMatch && priorityMatch;
        });

        return items.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [contentItems, filters, searchTerm, sortOrder]);

    const handleOrganize = useCallback(async () => {
        setIsOrganizing(true);
        setError('');
        try {
            const itemsToOrganize = contentItems.map(item => ({
                id: item.id,
                type: item.type,
                content: item.type === 'text' || item.type === 'url' ? item.content.substring(0, 100) : `[${item.type}]`
            }));
            const result = await geminiService.organizeContent(itemsToOrganize);
            
            if (result.organizedItems && Array.isArray(result.organizedItems)) {
                const updates = result.organizedItems
                    .map((item: any) => {
                        let priority: number | undefined = undefined;
                        if (item.priority !== null && item.priority !== undefined) {
                            const parsedPriority = parseInt(String(item.priority), 10);
                            if (!isNaN(parsedPriority)) {
                                priority = parsedPriority;
                            }
                        }
                        return {
                            id: item.id,
                            category: typeof item.category === 'string' ? item.category : undefined,
                            priority,
                        };
                    })
                    .filter(item => typeof item.id === 'string'); // Only include items that have a valid string ID from the AI
                
                if (updates.length > 0) {
                    await supabaseService.updateMultipleContentItems(updates);
                }
            }
        } catch (err: any) {
            console.error("Failed to organize content:", err);
            let errorMessage;
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'object' && err !== null) {
                errorMessage = JSON.stringify(err);
            } else {
                errorMessage = String(err);
            }
            setError(`AI organization failed: ${errorMessage || 'An unknown error occurred.'}`);
        } finally {
            setIsOrganizing(false);
        }
    }, [contentItems, setError]);

    return (
        <>
            <Header title="Dashboard" onOrganize={handleOrganize} isOrganizing={isOrganizing} onRefresh={onRefresh} isRefreshing={isLoading} />
            <main className="p-4 md:p-6">
                <AddContentForm onAdd={onAddItem} />

                <div className="my-6 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search content, tags, categories..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition bg-transparent dark:border-slate-600 dark:text-gray-200"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label htmlFor="sort-order" className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Sort by:</label>
                        <select
                            id="sort-order"
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>
                </div>

                <FilterBar allItems={contentItems} onFilterChange={setFilters} />
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                {isLoading && !contentItems.length ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader size="lg" />
                    </div>
                ) : (
                    <ContentGrid items={filteredItems} onUpdateItem={onUpdateItem} currentUser={currentUser.name} />
                )}
            </main>
        </>
    );
};

export default DashboardPage;