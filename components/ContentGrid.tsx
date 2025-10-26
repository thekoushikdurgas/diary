
import React from 'react';
import type { ContentItem } from '../types';
import ContentCard from './ContentCard';

interface ContentGridProps {
  items: ContentItem[];
  onUpdateItem: (item: Partial<ContentItem> & { id: string }) => Promise<void>;
  currentUser: string;
}

const ContentGrid: React.FC<ContentGridProps> = ({ items, onUpdateItem, currentUser }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>No content yet. Add something to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {items.map(item => (
        <ContentCard key={item.id} item={item} onUpdate={onUpdateItem} currentUser={currentUser} />
      ))}
    </div>
  );
};

export default ContentGrid;
