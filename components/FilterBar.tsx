
import React, { useState, useMemo, useEffect } from 'react';
import type { ContentItem, ActiveFilters } from '../types';

interface FilterBarProps {
    allItems: ContentItem[];
    onFilterChange: (filters: ActiveFilters) => void;
}

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
            }`}
        >
            {label}
        </button>
    );
};


const FilterBar: React.FC<FilterBarProps> = ({ allItems, onFilterChange }) => {
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ types: [], categories: [], tags: [], priorities: [] });

    const availableFilters = useMemo(() => {
        const types = new Set<string>();
        const categories = new Set<string>();
        const tags = new Set<string>();
        const priorities = new Set<number>();

        allItems.forEach(item => {
            types.add(item.type.replace('_', ' '));
            if (item.category) categories.add(item.category);
            if (item.tags) item.tags.forEach(tag => tags.add(tag));
            if (item.priority) priorities.add(item.priority);
        });

        return {
            types: Array.from(types).sort(),
            categories: Array.from(categories).sort(),
            tags: Array.from(tags).sort(),
            priorities: Array.from(priorities).sort((a, b) => a - b),
        };
    }, [allItems]);

    useEffect(() => {
        onFilterChange(activeFilters);
    }, [activeFilters, onFilterChange]);
    
    const toggleFilter = (filterType: keyof ActiveFilters, value: string | number) => {
        setActiveFilters(prev => {
            const currentValues = prev[filterType] as (string | number)[];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [filterType]: newValues };
        });
    };
    
    const hasActiveFilters = activeFilters.types.length > 0 || activeFilters.categories.length > 0 || activeFilters.tags.length > 0 || activeFilters.priorities.length > 0;

    const clearFilters = () => {
        setActiveFilters({ types: [], categories: [], tags: [], priorities: [] });
    };

    const renderFilterSection = (title: string, items: string[], filterType: 'types' | 'categories' | 'tags') => {
        if (items.length === 0) return null;
        return (
            <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{title}</h4>
                <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                        <FilterButton
                            key={item}
                            label={item}
                            isActive={(activeFilters[filterType] as string[]).includes(item)}
                            onClick={() => toggleFilter(filterType, item)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg my-6 space-y-4">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-bold text-text-primary dark:text-gray-100">Filters</h3>
             {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear All</button>
             )}
           </div>
           {renderFilterSection('Type', availableFilters.types, 'types')}
           {renderFilterSection('Category', availableFilters.categories, 'categories')}
           {availableFilters.priorities.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Priority</h4>
                    <div className="flex flex-wrap gap-2">
                        {availableFilters.priorities.map(p => (
                            <FilterButton
                                key={p}
                                label={`Priority ${p}`}
                                isActive={activeFilters.priorities.includes(p)}
                                onClick={() => toggleFilter('priorities', p)}
                            />
                        ))}
                    </div>
                </div>
            )}
           {renderFilterSection('Tags', availableFilters.tags, 'tags')}
        </div>
    );
};

export default FilterBar;
