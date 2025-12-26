
import { GoogleGenAI, Type } from "@google/genai";
import { CLINIC_CONFIG, DayOfWeek } from "../types";

export const suggestPhysioPlan = async (condition: string, durationWeeks: number = 2, selectedDays: DayOfWeek[] = []) => {
  // Use the mandatory initialization pattern with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const daysConstraint = selectedDays.length > 0 
    ? `The patient is ONLY scheduled to visit on the following days: ${selectedDays.join(', ')}. Do NOT generate sessions for any other days.`
    : "The patient visits daily.";

  // Upgrade to gemini-3-pro-preview for medical planning which involves complex reasoning (STEM task)
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Generate a daily physiotherapy plan for a patient with "${condition}" for ${durationWeeks} weeks at ${CLINIC_CONFIG.name}. 
    
    VISIT SCHEDULE:
    ${daysConstraint}

    STRICT MODALITY RULES:
    1. You must ONLY use the following four therapies: 'Shockwave Therapy', 'Laser Therapy', 'Ultrasound Therapy', and 'IFT Therapy'.
    2. Suggest exactly 1 or 2 therapies per scheduled visit day based on what is clinically appropriate for "${condition}".
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
    // Correctly access .text property from GenerateContentResponse
    const text = response.text;
    return JSON.parse(text || '[]');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return [];
  }
};

export const analyzeXrayImage = async (base64Image: string, mimeType: string, clinicalIssue: string, language: 'en' | 'mr' = 'en') => {
  // Create a new instance right before use to ensure latest API key context
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = base64Image.includes(',') 
    ? base64Image.split(',')[1].trim() 
    : base64Image.trim();
  
  const langPrompt = language === 'mr' 
    ? "Write the report strictly in Marathi language." 
    : "Write the report in English.";

  try {
    // Upgrade to gemini-3-pro-preview for advanced medical image analysis (Complex Reasoning/STEM)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
            
            STRICT OUTPUT PROTOCOL:
            1. CONTENT: Plain text ONLY. 
            2. NO MARKDOWN: Do not use asterisks (**), hashtags (#), or underscores (_) for any formatting.
            3. NO METADATA: Do not repeat patient details (Name, Age, Sex, Date, ID, etc.) at the top. This info is already on the letterhead.
            4. HEADERS: Use plain ALL-CAPS headers followed by a colon (e.g., RADIOLOGICAL FINDINGS:).
            5. START: Begin immediately with the RADIOLOGICAL FINDINGS.
            
            REPORT STRUCTURE:
            
            RADIOLOGICAL FINDINGS:
            [Write clinical observations here as plain text]
            
            IMPRESSION:
            [Clear diagnostic summary as plain text]
            
            RECOMMENDATIONS:
            [Follow-up suggestions as plain text]
            
            Write professionally as a formal document for ${CLINIC_CONFIG.clinicianName}.`
          }
        ]
      },
    });

    // Check for presence of response.text which returns string | undefined
    if (!response.text) {
      throw new Error("No text content returned from AI.");
    }

    return response.text;
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    throw new Error(`AI Analysis Error: ${err.message || 'Unknown issue'}`);
  }
};
