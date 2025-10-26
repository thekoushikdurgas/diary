
export type ContentType = 'text' | 'image' | 'audio' | 'url' | 'ai_image';

export interface BaseContentItem {
  id: string;
  type: ContentType;
  content: string;
  createdAt: string;
  category?: string;
  priority?: number;
  aiAnalysis?: string;
  transcription?: string;
  summary?: string;
  tags?: string[];
}

export interface TextContentItem extends BaseContentItem {
  type: 'text';
}

export interface ImageContentItem extends BaseContentItem {
  type: 'image' | 'ai_image';
  content: string; // base64 data URL
  mimeType: string;
}

export interface AudioContentItem extends BaseContentItem {
  type: 'audio';
  content: string; // base64 data URL
  mimeType: string;
}

export interface UrlContentItem extends BaseContentItem {
  type: 'url';
}

export type ContentItem = TextContentItem | ImageContentItem | AudioContentItem | UrlContentItem;

export interface AiChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingSources?: GroundingSource[];
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface ActiveFilters {
    types: string[];
    categories: string[];
    tags: string[];
    priorities: number[];
}

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface UserSettings {
    theme: 'light' | 'dark';
    notificationsEnabled: boolean;
}
