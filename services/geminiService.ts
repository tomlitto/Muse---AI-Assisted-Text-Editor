import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FileAttachment, Suggestion } from '../types';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates a full draft based on a prompt and optional file attachments.
 * Uses gemini-3-pro-preview for complex reasoning and long-form content.
 */
export const generateDraft = async (
  prompt: string,
  attachments: FileAttachment[]
): Promise<string> => {
  const ai = getAiClient();
  
  const parts: any[] = [];
  
  // Add attachments
  attachments.forEach(file => {
    // Strip header from base64 if present for the API, though inlineData usually handles standard base64
    const base64Data = file.data.includes('base64,') 
      ? file.data.split('base64,')[1] 
      : file.data;
      
    parts.push({
      inlineData: {
        mimeType: file.type,
        data: base64Data
      }
    });
  });

  // Check for media
  const hasMedia = attachments.some(a => a.type.startsWith('audio/') || a.type.startsWith('video/'));

  // Construct Prompt
  let systemDirective = `You are a world-class writer and thought partner. 
    Write a comprehensive draft based on the following instructions. 
    Use formatting (markdown) effectively.`;

  if (hasMedia) {
    systemDirective += `\n\nThe user has attached media files (audio or video). 
    IMPORTANT: Use the spoken content/speech from these files as the PRIMARY source material for the draft.
    Transcribe, summarize, or restructure the spoken content into a high-quality written document.`;
  }

  let userInstructions = prompt.trim();
  if (!userInstructions && hasMedia) {
      userInstructions = "Draft a comprehensive document based on the speech in the attached media.";
  }

  // Add text prompt
  parts.push({
    text: `${systemDirective}\n\nInstructions: ${userInstructions}`
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: "You are an expert writer. Output clean, well-structured Markdown.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Draft generation error:", error);
    throw error;
  }
};

/**
 * Iterates on a specific selection of text based on user feedback.
 * Uses gemini-2.5-flash for speed.
 */
export const refineSelection = async (
  selectedText: string,
  instruction: string,
  fullContext: string
): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
  I have a document. Here is the context of the document for reference:
  ---
  ${fullContext.slice(0, 1000)}... (truncated)
  ---

  I want you to rewrite the following specific text selection based on my instruction.
  
  Selection to rewrite: "${selectedText}"
  
  Instruction: ${instruction}
  
  Return ONLY the rewritten text. Do not add quotes or conversational filler.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || selectedText;
  } catch (error) {
    console.error("Refinement error:", error);
    throw error;
  }
};

/**
 * Proactively scans text to offer improvements.
 * Uses gemini-2.5-flash for speed.
 */
export const scanForImprovements = async (text: string): Promise<Suggestion[]> => {
  if (!text || text.length < 50) return [];
  
  const ai = getAiClient();

  const prompt = `
  Analyze the following text and identify up to 3 areas where the writing could be significantly improved (clarity, tone, punchiness).
  
  Text:
  ${text}
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        originalText: { type: Type.STRING, description: "The exact substring from the text that needs improvement" },
        suggestedText: { type: Type.STRING, description: "The improved version" },
        reason: { type: Type.STRING, description: "Brief explanation of why this is better" }
      },
      required: ["id", "originalText", "suggestedText", "reason"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    
    // Parse the JSON array
    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (error) {
    console.error("Scan error:", error);
    return [];
  }
};