import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, InsultContent } from "../types";
import { SYSTEM_INSTRUCTION_INSULT, SYSTEM_INSTRUCTION_ENCOURAGEMENT, SYSTEM_INSTRUCTION_VERIFY, SYSTEM_INSTRUCTION_VERIFY_HAPPY, SYSTEM_INSTRUCTION_PUNISHMENT, SYSTEM_INSTRUCTION_PUNISHMENT_HAPPY } from "../constants";

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
};

export const generateInsult = async (profile: UserProfile, currentTask: string, modeStyle: 'HAPPY' | 'EVIL'): Promise<InsultContent> => {
  try {
    const ai = getAI();
    
    // Generate Text Only
    const prompt = `
    User Profile:
    Name: ${profile.name}
    Major/Field: ${profile.major}
    Weakness: ${profile.weakness}
    Ambition: ${profile.ambition}
    Rival/Enemy: ${profile.enemy}
    Additional Context (Use this to be specific!): ${profile.additionalInfo}
    
    Current Task they should be doing: ${currentTask}
    
    Generate a ${modeStyle === 'HAPPY' ? 'positive, uplifting affirmation' : 'brutal, personalized insult/threat'}.
    `;

    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: modeStyle === 'HAPPY' ? SYSTEM_INSTRUCTION_ENCOURAGEMENT : SYSTEM_INSTRUCTION_INSULT,
        temperature: 1.2, 
      }
    });

    const insultText = textResponse.text || (modeStyle === 'HAPPY' ? "You are doing great. Keep it up." : "You are wasting space. Get to work.");

    return {
      text: insultText,
    };

  } catch (error) {
    console.error("Insult gen failed:", error);
    return { text: "Work harder. The AI is judging your connection." };
  }
};

export const verifyTaskCompletion = async (task: string, proofDescription: string, modeStyle: 'HAPPY' | 'EVIL', proofImageBase64?: string): Promise<{success: boolean, message: string}> => {
    const ai = getAI();
    
    const parts: any[] = [{ text: `Task: ${task}. User Description: ${proofDescription}` }];
    if (proofImageBase64) {
        const data = proofImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType: 'image/jpeg', data } });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            systemInstruction: modeStyle === 'HAPPY' ? SYSTEM_INSTRUCTION_VERIFY_HAPPY : SYSTEM_INSTRUCTION_VERIFY,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    success: { type: Type.BOOLEAN },
                    message: { type: Type.STRING }
                },
                required: ['success', 'message']
            }
        }
    });

    const json = JSON.parse(response.text || '{"success": false, "message": "Failed to verify"}');
    return json;
};

export const generatePunishment = async (style: 'PUBLIC' | 'PRIVATE' | 'SOCIAL' | 'CUSTOM', modeStyle: 'HAPPY' | 'EVIL', customPrompt?: string): Promise<string> => {
    const ai = getAI();
    let prompt = `Generate a ${modeStyle === 'HAPPY' ? 'positive activity' : 'punishment'} for the setting: ${style}. Keep it verifyingly static.`;
    
    if (style === 'CUSTOM' && customPrompt) {
        prompt += `\n\nUSER CUSTOM RULES: ${customPrompt}`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: modeStyle === 'HAPPY' ? SYSTEM_INSTRUCTION_PUNISHMENT_HAPPY : SYSTEM_INSTRUCTION_PUNISHMENT,
        }
    });
    return response.text || (modeStyle === 'HAPPY' ? "Smile at the camera." : "Salute the camera.");
};

export const verifyPunishment = async (proofImageBase64: string): Promise<boolean> => {
     try {
        const ai = getAI();
        const data = proofImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data } },
                { text: "Does this image show a person performing the requested static pose or looking humbled/punished? Answer YES or NO." }
            ]
        },
        config: { temperature: 0 }
        });
        
        const text = response.text?.trim().toUpperCase();
        return text?.includes("YES") || false;
    } catch (e) {
        return true; // Fail open
    }
}