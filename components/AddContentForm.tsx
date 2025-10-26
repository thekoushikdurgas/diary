
import React, { useState } from 'react';
import type { AspectRatio, ContentType } from '../types';
import { generateImage } from '../services/geminiService';
import Loader from './Loader';

interface AddContentFormProps {
  onAdd: (item: any) => Promise<void>;
}

const contentTypes: { id: ContentType | 'file'; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'url', label: 'URL' },
  { id: 'ai_image', label: 'AI Image' },
  { id: 'file', label: 'File' },
];

const AddContentForm: React.FC<AddContentFormProps> = ({ onAdd }) => {
  const [activeTab, setActiveTab] = useState<ContentType | 'file'>('text');
  const [inputValue, setInputValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      if (activeTab === 'text' || activeTab === 'url') {
        if (!inputValue.trim()) return;
        await onAdd({ type: activeTab, content: inputValue });
      } else if (activeTab === 'ai_image') {
        if (!inputValue.trim()) return;
        const { base64Image, mimeType } = await generateImage(inputValue, aspectRatio);
        await onAdd({ type: 'ai_image', content: base64Image, mimeType });
      } else if (activeTab === 'file' && file) {
          const content = await fileToBase64(file);
          const type = file.type.startsWith('image/') ? 'image' : 'audio';
          await onAdd({ type, content, mimeType: file.type });
      }
      setInputValue('');
      setFile(null);
    } catch (err) {
      console.error("Failed to add content:", err);
      setError('Failed to add content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const baseInputClasses = "w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition bg-transparent dark:border-slate-600 dark:text-gray-200 dark:placeholder-gray-500";
  
  const renderInput = () => {
    switch(activeTab) {
        case 'text':
            return <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Enter your note..." className={baseInputClasses} rows={4}></textarea>;
        case 'url':
            return <input type="url" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="https://example.com" className={baseInputClasses} />;
        case 'ai_image':
            return (
                <div className="space-y-3">
                    <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Describe the image to generate..." className={baseInputClasses} />
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as AspectRatio)} className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                        <option value="1:1">Square (1:1)</option>
                        <option value="16:9">Landscape (16:9)</option>
                        <option value="9:16">Portrait (9:16)</option>
                        <option value="4:3">Standard (4:3)</option>
                        <option value="3:4">Tall (3:4)</option>
                    </select>
                </div>
            );
        case 'file':
            return <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} accept="image/*,audio/*" className="w-full p-3 border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 dark:border-slate-600 dark:text-gray-400"/>;
        default:
            return null;
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-8">
      <div className="flex border-b dark:border-slate-700 mb-4">
        {contentTypes.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-4 font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {renderInput()}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:bg-primary/50">
            {isLoading ? <Loader size="sm" /> : 'Add Content'}
        </button>
      </form>
    </div>
  );
};

export default AddContentForm;
