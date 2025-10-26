
import React, { useState, useMemo } from 'react';
import type { ContentItem, User } from '../types';
import Header from '../components/Header';
import ContentCard from '../components/ContentCard';

interface CalendarPageProps {
  items: ContentItem[];
  onUpdateItem: (item: Partial<ContentItem> & { id: string }) => Promise<void>;
  currentUser: User;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ items, onUpdateItem, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = Array.from({ length: lastDayOfMonth.getDate() }, (_, i) => i + 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.

    const itemsByDate = useMemo(() => {
        const map = new Map<string, ContentItem[]>();
        items.forEach(item => {
            const date = new Date(item.createdAt).toDateString();
            if (!map.has(date)) {
                map.set(date, []);
            }
            map.get(date)?.push(item);
        });
        return map;
    }, [items]);

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };
    
    const selectedDateItems = itemsByDate.get(selectedDate.toDateString()) || [];

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    return (
        <>
            <Header title="Calendar View" />
            <div className="p-4 md:p-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">&lt;</button>
                        <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => changeMonth(1)} className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">&gt;</button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-500 dark:text-gray-400 text-sm">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2 mt-2">
                        {Array.from({ length: startingDayOfWeek }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {daysInMonth.map(day => {
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const hasItems = itemsByDate.has(date.toDateString());
                            const isToday = isSameDay(date, new Date());
                            const isSelected = isSameDay(date, selectedDate);
                            
                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate(date)}
                                    className={`p-2 h-20 flex flex-col items-center justify-start cursor-pointer rounded-lg transition-colors border-2 ${
                                        isSelected ? 'border-primary' : 'border-transparent'
                                    } ${ isToday ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                >
                                    <span className={`font-medium ${isToday ? 'text-primary' : 'text-text-primary dark:text-gray-200'}`}>{day}</span>
                                    {hasItems && <div className="w-2 h-2 bg-accent rounded-full mt-1"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-text-primary dark:text-gray-100 mb-4">
                        Content for {selectedDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    {selectedDateItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {selectedDateItems.map(item => (
                                <ContentCard key={item.id} item={item} onUpdate={onUpdateItem} currentUser={currentUser.name} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                           <p>No content for this day.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default CalendarPage;
