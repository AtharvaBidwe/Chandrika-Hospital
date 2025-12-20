
import { GoogleGenAI, Type } from "@google/genai";
import { CLINIC_CONFIG } from "../types";

export const suggestPhysioPlan = async (condition: string, durationWeeks: number = 1) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a daily physiotherapy plan for a patient with "${condition}" for ${durationWeeks} week at ${CLINIC_CONFIG.name}. 
    
    STRICT MODALITY RULES:
    1. You must ONLY use the following four therapies: 'Shockwave Therapy', 'Laser Therapy', 'Ultrasound Therapy', and 'IFT Therapy'.
    2. Suggest exactly 1 or 2 therapies per day based on what is clinically appropriate for "${condition}".
    3. Set clinical durations (in minutes) and specific notes (e.g. intensity, frequency, or specific body part focus).
    4. Do not suggest exercises, stretches, or manual therapy unless specifically asked. Stick to the 4 machines listed above.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dayName: { type: Type.STRING, description: "Day of week (e.g., Monday)" },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { 
                    type: Type.STRING, 
                    description: "Must be one of: Shockwave Therapy, Laser Therapy, Ultrasound Therapy, IFT Therapy" 
                  },
                  duration: { type: Type.NUMBER, description: "Duration in minutes" },
                  notes: { type: Type.STRING, description: "Clinical notes for this machine setting" }
                },
                required: ["name", "duration", "notes"]
              }
            }
          },
          required: ["dayName", "sessions"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const analyzePainPatterns = async (conditions: string[]) => {
  if (conditions.length === 0) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these patient conditions: ${conditions.join(", ")}. 
    Categorize them into exactly these 5 pain types: 'Neuropathic', 'Mechanical', 'Inflammatory', 'Post-Surgical', 'Chronic/Central'.
    Return the count for each category based on the input list. If a condition fits multiple, pick the most dominant physiological cause.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "The pain type category name" },
            A: { type: Type.NUMBER, description: "The count of patients in this category" },
            fullMark: { type: Type.NUMBER, description: "Total number of patients provided" }
          },
          required: ["subject", "A", "fullMark"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Failed to parse AI pain analysis", e);
    return [];
  }
};

export const analyzeXrayImage = async (base64Image: string, mimeType: string, clinicalIssue: string, language: 'en' | 'mr' = 'en') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean base64 data
  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1].trim() 
    : base64Image.trim();
  
  const langPrompt = language === 'mr' 
    ? "Write the report strictly in Marathi language." 
    : "Write the report in English.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Switched to Flash for higher quota and lower latency
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `You are a professional Senior Radiologist at ${CLINIC_CONFIG.name}. 
            Analyze this medical X-ray imaging for clinical indication: "${clinicalIssue}".
            ${langPrompt}
            
            STRICT FORMATTING RULES:
            1. DO NOT repeat patient metadata (Name, Age, Sex, Phone, Date, or Clinical Indication) at the top of the report.
            2. DO NOT use Markdown formatting (like **bold** or *italics*).
            3. Use plain capitalized headers for sections.
            4. Start directly with the RADIOLOGICAL FINDINGS.
            
            Report Structure:
            
            RADIOLOGICAL FINDINGS:
            - Detail all visible skeletal or soft tissue structures.
            - Identify any fractures, misalignments, or degenerative changes.
            
            IMPRESSION:
            - Provide a clear diagnostic summary.
            
            RECOMMENDATIONS:
            - State any suggested clinical follow-up.
            
            Write it as an authoritative medical document for the primary physician, ${CLINIC_CONFIG.clinicianName}.`
          }
        ]
      },
    });

    if (!response.text) {
      throw new Error("No text content returned from AI.");
    }

    return response.text;
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    throw new Error(`AI Analysis Error: ${err.message || 'Unknown issue'}`);
  }
};
