
// Fix: Import GoogleGenAI, GenerateContentResponse, and Content from "@google/genai"
// Fix: Removed GenerateContentStreamResult as it's not an exported member of @google/genai.
// The return type of generateContentStream is AsyncIterable<GenerateContentResponse>.
import { GoogleGenAI, GenerateContentResponse, Content, Part } from "@google/genai"; // Added Part for clarity, though Content implies it
import { GEMINI_MODEL_TEXT } from '../constants';

// The GeminiService class is removed as per the thought process to directly use GoogleGenAI instance in App.tsx
// The following functions are examples of how to use the SDK, adapted from the original class methods.
// They are not directly used by App.tsx in this refactoring but serve as examples.

export async function generateTextWithGoogleAI(ai: GoogleGenAI, prompt: string): Promise<string> {
  try {
    // Fix: Use ai.models.generateContent and provide prompt directly in contents
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: [{ parts: [{ text: prompt }] }], // Ensure contents is an array of Content objects
      config: {
        temperature: 0.5,
        topP: 0.9,
        topK: 40,
      }
    });
    // Fix: Access text directly from response
    return response.text;
  } catch (error) {
    console.error("Error generating text from Gemini:", error);
    throw new Error(`Gemini API error: ${(error as Error).message}`);
  }
}
  
export async function generateContentWithImageAndTextWithGoogleAI(
  ai: GoogleGenAI,
  textPrompt: string,
  base64ImageData: string,
  mimeType: string
): Promise<string> {
  try {
    const imagePart: Part = { // Explicit Part type
      inlineData: {
        mimeType: mimeType,
        data: base64ImageData,
      },
    };
    const textPart: Part = { text: textPrompt }; // Explicit Part type
    
    // Fix: Structure 'contents' as an array of Content objects for multimodal input
    const contents: Content[] = [{ parts: [textPart, imagePart] }];

    // Fix: Use ai.models.generateContent
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT, 
      contents: contents,
      config: {
          temperature: 0.5,
          topP: 0.9,
          topK: 40,
      }
    });
    // Fix: Access text directly from response
    return response.text;
  } catch (error) {
    console.error("Error generating content with image/audio from Gemini:", error);
    throw new Error(`Gemini API error (multimodal): ${(error as Error).message}`);
  }
}

export async function generateTextStreamWithGoogleAI(ai: GoogleGenAI, prompt: string, onChunk: (chunk: string) => void): Promise<void> {
  try {
    // Fix: Use ai.models.generateContentStream and provide prompt directly in contents
    // Fix: Updated type to AsyncIterable<GenerateContentResponse>
    const responseStream: AsyncIterable<GenerateContentResponse> = await ai.models.generateContentStream({
      model: GEMINI_MODEL_TEXT,
      contents: [{ parts: [{ text: prompt }] }], // Ensure contents is an array of Content objects
    });

    for await (const chunk of responseStream) {
      // Fix: Access text directly from chunk
      onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error generating text stream from Gemini:", error);
    throw new Error(`Gemini API streaming error: ${(error as Error).message}`);
  }
}
