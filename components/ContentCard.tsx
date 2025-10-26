import React, { useState, useEffect, useRef } from 'react';
import type { ContentItem } from '../types';
import * as geminiService from '../services/geminiService';
import Loader from './Loader';
import { XMarkIcon, DocumentTextIcon, LightBulbIcon, SpeakerWaveIcon, PencilIcon, CheckIcon } from './icons';

interface ContentCardProps {
  item: ContentItem;
  onUpdate: (item: Partial<ContentItem> & { id: string }) => Promise<void>;
  currentUser: string;
}

const renderContent = (item: ContentItem, isEditing: boolean, editedContent: string, setEditedContent: (c: string) => void) => {
  if (item.type === 'text') {
    if (isEditing) {
      return (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm bg-transparent dark:border-slate-600"
          rows={4}
          autoFocus
        />
      );
    }
    return <p className="text-text-primary dark:text-gray-300 whitespace-pre-wrap">{item.content}</p>;
  }

  switch (item.type) {
    case 'url':
      return <a href={item.content} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{item.content}</a>;
    case 'image':
    case 'ai_image':
      return <img src={item.content} alt="User content" className="rounded-lg object-cover w-full h-auto" />;
    case 'audio':
      return <audio controls src={item.content} className="w-full" />;
    default:
      return null;
  }
};

const ContentCard: React.FC<ContentCardProps> = ({ item, onUpdate, currentUser }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(item.content);
    const [justUpdated, setJustUpdated] = useState(false);
    const prevItemRef = useRef<ContentItem>();

    const isNewlyCreated = (new Date().getTime() - new Date(item.createdAt).getTime()) < 15000; // 15 seconds
    const isAiPending = isNewlyCreated && !item.category;

    useEffect(() => {
        if (prevItemRef.current && prevItemRef.current.id === item.id) {
            if (JSON.stringify(prevItemRef.current) !== JSON.stringify(item)) {
                setJustUpdated(true);
                const timer = setTimeout(() => setJustUpdated(false), 1500);
                return () => clearTimeout(timer);
            }
        }
        prevItemRef.current = item;
    }, [item]);

    useEffect(() => {
        setEditedContent(item.content);
    }, [item.content]);

    const handleAnalyze = async () => {
        if (item.type !== 'image' && item.type !== 'ai_image') return;
        setIsLoading(true);
        setError('');
        try {
            const analysis = await geminiService.analyzeImage(item.content, (item as any).mimeType, "Describe this image in detail.");
            onUpdate({ id: item.id, aiAnalysis: analysis });
        } catch (e) {
            setError('Failed to analyze image.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleTranscribe = async () => {
        if (item.type !== 'audio') return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(item.content);
            const blob = await response.blob();
            const file = new File([blob], "audio." + (item as any).mimeType.split('/')[1], { type: (item as any).mimeType });

            const transcription = await geminiService.transcribeAudio(file);
            onUpdate({ id: item.id, transcription });
        } catch (e) {
            setError('Failed to transcribe audio.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditImage = async (prompt: string) => {
        if ((item.type !== 'image' && item.type !== 'ai_image') || !prompt) return;
        setIsLoading(true);
        setError('');
        try {
            const { base64Image, mimeType } = await geminiService.editImage(item.content, (item as any).mimeType, prompt);
            onUpdate({ id: item.id, content: base64Image, mimeType });
        } catch (e) {
            setError('Failed to edit image.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSummarize = async () => {
        if (item.type !== 'text' && item.type !== 'audio' && item.type !== 'url') return;
        setIsLoading(true);
        setError('');
        try {
            let contentToSummarize: string;
            let generatedTranscription: string | undefined;
    
            if (item.type === 'text' || item.type === 'url') {
                contentToSummarize = item.content;
            } else { // item.type === 'audio'
                if (item.transcription) {
                    contentToSummarize = item.transcription;
                } else {
                    const response = await fetch(item.content);
                    const blob = await response.blob();
                    const file = new File([blob], "audio." + (item as any).mimeType.split('/')[1], { type: (item as any).mimeType });
                    generatedTranscription = await geminiService.transcribeAudio(file);
                    contentToSummarize = generatedTranscription;
                }
            }
    
            const contentType = item.type as 'text' | 'audio' | 'url';
            const summary = await geminiService.summarizeContent(contentToSummarize, contentType);
            
            const updatePayload: Partial<ContentItem> = { summary };
            if (generatedTranscription) {
                updatePayload.transcription = generatedTranscription;
            }
            
            onUpdate({ id: item.id, ...updatePayload });
        } catch (e) {
            setError('Failed to generate summary.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (!item.tags?.includes(newTag)) {
                onUpdate({ id: item.id, tags: [...(item.tags || []), newTag] });
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onUpdate({ id: item.id, tags: item.tags?.filter(tag => tag !== tagToRemove) });
    };

    const handleSaveEdit = () => {
        if (item.content !== editedContent) {
            onUpdate({ id: item.id, content: editedContent });
        }
        setIsEditing(false);
    };

    return (
        <div 
            className={`bg-card-bg dark:bg-slate-800 p-4 rounded-xl shadow-md flex flex-col gap-3 relative transition-all duration-500 ${justUpdated ? 'ring-2 ring-accent' : 'ring-0 ring-transparent'} group`}
        >
             {isLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex items-center justify-center rounded-xl z-10">
                    <Loader />
                </div>
            )}
            <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                {item.category && <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">{item.category}</span>}
            </div>

            <div className="flex-grow relative">
                {renderContent(item, isEditing, editedContent, setEditedContent)}
                {item.type === 'text' && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="absolute top-0 right-0 bg-gray-200/50 dark:bg-slate-600/50 p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-slate-500/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PencilIcon className="w-4 h-4"/>
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 bg-primary text-white text-sm font-bold py-1 px-2 rounded-lg hover:bg-blue-700 transition">Save</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 text-sm py-1 px-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition">Cancel</button>
                </div>
            )}
            
            {(item.summary || item.aiAnalysis || item.transcription) && (
                <div className="space-y-2 border-t dark:border-slate-700 pt-3 mt-1">
                    {item.summary && (
                        <div className="bg-secondary/5 border-l-4 border-secondary p-3 rounded-r-lg">
                            <h4 className="font-bold text-secondary text-sm mb-1 flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4" />
                                AI Summary
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-400 italic">{item.summary}</p>
                        </div>
                    )}
                    {item.aiAnalysis && (
                        <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-r-lg">
                            <h4 className="font-bold text-primary text-sm mb-1 flex items-center gap-2">
                                <LightBulbIcon className="w-4 h-4" />
                                AI Analysis
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-400">{item.aiAnalysis}</p>
                        </div>
                    )}
                    {item.transcription && (
                        <div className="bg-accent/5 border-l-4 border-accent p-3 rounded-r-lg">
                            <h4 className="font-bold text-accent text-sm mb-1 flex items-center gap-2">
                                <SpeakerWaveIcon className="w-4 h-4" />
                                Transcription
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-400">{item.transcription}</p>
                        </div>
                    )}
                </div>
            )}

            {isAiPending && (
                <div className="flex items-center gap-2 text-xs text-gray-500 italic mt-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-md">
                    <Loader size="xs" />
                    <span>AI is categorizing...</span>
                </div>
            )}

            {(item.tags && item.tags.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map(tag => (
                        <span key={tag} className="flex items-center text-xs font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
                                <XMarkIcon className="w-3 h-3"/>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-1">
                 <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag..."
                    className="flex-grow text-xs p-1 border-b focus:outline-none focus:border-primary bg-transparent dark:border-slate-600"
                />
            </div>
            
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            
            {!isEditing && (
                <div className="flex gap-2 flex-wrap text-sm pt-2 border-t dark:border-slate-700 mt-2">
                    {(item.type === 'image' || item.type === 'ai_image') && (
                        <>
                            {!item.aiAnalysis && (
                                <button onClick={handleAnalyze} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition">
                                    <LightBulbIcon className="w-4 h-4" /> Analyze
                                </button>
                            )}
                            <button onClick={() => {
                                const prompt = window.prompt("How should I edit this image?");
                                if (prompt) handleEditImage(prompt);
                            }} className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-full hover:bg-accent/20 transition">
                                <PencilIcon className="w-4 h-4" /> Edit
                            </button>
                        </>
                    )}
                    {item.type === 'audio' && !item.transcription && (
                        <button onClick={handleTranscribe} className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-full hover:bg-accent/20 transition">
                            <SpeakerWaveIcon className="w-4 h-4" /> Transcribe
                        </button>
                    )}
                    {(item.type === 'text' || item.type === 'audio' || item.type === 'url') && !item.summary && (
                        <button onClick={handleSummarize} className="flex items-center gap-1.5 bg-secondary/10 text-secondary px-3 py-1 rounded-full hover:bg-secondary/20 transition">
                            <DocumentTextIcon className="w-4 h-4" /> Summarize
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContentCard;