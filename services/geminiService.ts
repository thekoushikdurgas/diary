
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import type { AspectRatio, ContentType } from '../types';

let ai: GoogleGenAI;

const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

// --- Helper Functions ---
const fileToGenerativePart = (file: File) => {
    return new Promise<{ mimeType: string, data: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error("Failed to read file as base64 string"));
            }
            const base64Data = reader.result.split(',')[1];
            resolve({
                mimeType: file.type,
                data: base64Data,
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const base64ToGenerativePart = (base64: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64.split(',')[1],
            mimeType,
        },
    };
};


// --- API Functions ---

export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAi();
    const imagePart = base64ToGenerativePart(base64Image, mimeType);
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    return response.text;
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<{ base64Image: string, mimeType: string }> => {
    const ai = getAi();
    const imagePart = base64ToGenerativePart(base64Image, mimeType);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const generatedPart = response.candidates?.[0]?.content?.parts?.[0];
    if (generatedPart?.inlineData) {
        return {
            base64Image: `data:${generatedPart.inlineData.mimeType};base64,${generatedPart.inlineData.data}`,
            mimeType: generatedPart.inlineData.mimeType,
        };
    }
    throw new Error("Failed to edit image.");
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<{ base64Image: string, mimeType: string }> => {
    const ai = getAi();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio,
        },
    });

    const generatedImage = response.generatedImages[0];
    if (generatedImage?.image?.imageBytes) {
        return {
            base64Image: `data:image/png;base64,${generatedImage.image.imageBytes}`,
            mimeType: 'image/png',
        };
    }
    throw new Error("Failed to generate image.");
};

export const transcribeAudio = async (audioFile: File): Promise<string> => {
    const ai = getAi();
    const audioPart = await fileToGenerativePart(audioFile);
    const promptPart = { text: "Transcribe this audio." };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: audioPart }, promptPart] }
    });
    return response.text;
};

export const categorizeAndTagContent = async (
    item: { type: ContentType; content: string; mimeType?: string }
): Promise<{ category: string; tags: string[] }> => {
    const ai = getAi();
    let basePrompt = `
        You are an expert content organizer. Analyze the following content and provide a single, most relevant category and a list of 2-4 relevant tags.
        
        Available Categories: Work, Personal, Learning, Health, Finance, Travel, Technology, Entertainment, News, Reference.
        If none of these fit well, you can suggest a new, simple, one-word category.
        Tags should be lowercase, single words.

        Content to analyze:
    `;
    
    let model = 'gemini-2.5-pro';
    let contents: any;

    switch (item.type) {
        case 'text': // This now handles original text, summarized URLs, and transcribed audio
            contents = `${basePrompt}\nType: Text Content\nContent: "${item.content.substring(0, 2000)}..."`;
            break;
        case 'image':
        case 'ai_image':
            if (!item.mimeType) throw new Error("Mime type is required for image analysis.");
            const imagePart = base64ToGenerativePart(item.content, item.mimeType);
            const textPart = { text: `${basePrompt}\nType: Image. Describe the image, then provide a category and tags for it.` };
            contents = { parts: [imagePart, textPart] };
            model = 'gemini-2.5-flash';
            break;
        default:
            // The 'url' and 'audio' types are pre-processed in App.tsx into 'text' before calling this function.
            // This default case handles any unexpected types.
            throw new Error(`Unsupported content type for categorization: ${item.type}`);
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    category: {
                        type: Type.STRING,
                        description: "A single, relevant category for the content."
                    },
                    tags: {
                        type: Type.ARRAY,
                        description: "A list of 2-4 relevant lowercase tags.",
                        items: {
                            type: Type.STRING
                        }
                    }
                },
                required: ["category", "tags"]
            }
        }
    });

    return JSON.parse(response.text);
};

export const organizeContent = async (contentItems: { id: string; type: string; content: string }[]): Promise<any> => {
    const ai = getAi();
    const prompt = `
      You are an expert organizer. Given the following list of content items, please categorize each one and assign a priority from 1 (lowest) to 5 (highest).
      The categories should be simple and general, like "Work", "Personal", "Learning", "Urgent", "Reference".
      
      Content Items:
      ${JSON.stringify(contentItems, null, 2)}
      
      Please return your response as a JSON object with the key "organizedItems", which is an array of objects. Each object should have "id", "category", and "priority".
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    organizedItems: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                category: { type: Type.STRING },
                                priority: { type: Type.INTEGER },
                            },
                            required: ["id", "category", "priority"],
                        }
                    }
                },
                required: ["organizedItems"]
            },
        },
    });
    
    return JSON.parse(response.text);
};

export const summarizeContent = async (content: string, contentType: 'text' | 'audio' | 'url'): Promise<string> => {
    const ai = getAi();
    let prompt: string;
    let config: any = {};
    let model = 'gemini-2.5-flash';

    switch (contentType) {
        case 'url':
            prompt = `Provide a concise summary of the main content found at this URL: ${content}`;
            // Use grounding to allow the model to access the URL's content.
            config.tools = [{ googleSearch: {} }];
            model = 'gemini-2.5-pro'; // Pro is better for this task
            break;
        case 'audio':
            prompt = `Please provide a concise summary of the following transcribed audio. The summary should capture the key points and main ideas.\n\nContent:\n---\n${content}\n---`;
            break;
        case 'text':
        default:
            prompt = `Please provide a concise summary of the following text. The summary should capture the key points and main ideas.\n\nContent:\n---\n${content}\n---`;
            break;
    }

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
    });
    return response.text;
};


export const getChatResponse = async (
    prompt: string,
    useDeepThought: boolean,
    userLocation?: { latitude: number; longitude: number }
): Promise<{ text: string, groundingSources?: any[] }> => {
    const ai = getAi();
    
    const model = useDeepThought ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const tools: any[] = [{ googleSearch: {} }];
    let toolConfig: any = {};

    if (userLocation) {
        tools.push({ googleMaps: {} });
        toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                }
            }
        };
    }

    const config: any = {
        tools,
        toolConfig,
    };

    if (useDeepThought) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
    });
    
    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    return {
        text: response.text,
        groundingSources
    };
};
