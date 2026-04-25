import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `
You are StyleGenie, an expert fashion stylist and ecommerce recommendation assistant.
Your goal is to help users find the perfect outfit based on their gender, age, city (weather/local culture), and personal style preferences.

When recommending clothes:
1. Consider the city's current weather and typical style.
2. Suggest items that fit the user's style (e.g., minimalist, bohemian, street-wear, formal).
3. Provide a friendly, expert explanation for why these items suit them.
4. If appropriate, return a list of recommended products in a structured format.

Always maintain a helpful, fashionable, and encouraging tone.
`;

export async function getRecommendations(
  userProfile: UserProfile,
  history: ChatMessage[],
  newMessage: string
) {
  const model = "gemini-3-flash-preview";
  
  const contents = [
    { role: 'user', parts: [{ text: `My Profile:
Gender: ${userProfile.gender}
Age: ${userProfile.age}
City: ${userProfile.city}
Preferred Style: ${userProfile.style}` }] },
    ...history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { 
              type: Type.STRING, 
              description: "The assistant's conversational response." 
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  price: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  style: { type: Type.STRING },
                  imageKeyword: { type: Type.STRING, description: "A few keywords for the image, e.g., 'blue denim jacket', 'red floral dress'." },
                  reason: { type: Type.STRING, description: "Why this was recommended." }
                },
                required: ["id", "name", "price", "description"]
              }
            }
          },
          required: ["text"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      text: "I'm sorry, I encountered an error while trying to style you. Could you try again?",
      recommendations: []
    };
  }
}

export async function generateProductImage(description: string, gender: string, style: string) {
  // Using gemini-2.5-flash-image (Nano Banana) for standard AI Studio Build compatibility
  const model = "gemini-2.5-flash-image";
  const prompt = `A professional high-end boutique ecommerce product photography shot of ${description}. The item is specifically for a ${gender} audience and fits a ${style} fashion style. Clean professional studio lighting, minimal background, high-resolution fashion catalog style.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    
    // Log if no inline data found
    console.warn("No image data returned from Nano Banana");
    return null;
  } catch (error) {
    console.error("Nano Banana Generation Error:", error);
    return null;
  }
}
