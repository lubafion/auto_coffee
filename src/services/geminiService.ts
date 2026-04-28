import { GoogleGenAI, Type } from "@google/genai";
import { AgentInput, AgentOutput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function decideCoffeeOrder(input: AgentInput): Promise<AgentOutput> {
  const prompt = `
    You are an AI Coffee Ordering Agent for a busy professional.
    Your task is to decide whether to order coffee RIGHT NOW based on the following context:

    CONTEXT:
    - Current Time: ${input.currentTime}
    - Location Status: ${input.movementStatus}
    - Weather: ${input.weather}
    - Work Mode: ${input.workMode} (Office/Remote/OOO)
    - Today Ordered: ${input.todayOrdered}
    - Last Order Time: ${input.lastOrderTime || 'N/A'}
    - Last Order Menu: ${input.lastOrderMenu || 'N/A'}

    RULES:
    1. Only order if working from the office and approaching the office (Location: 'Near Office').
    2. Do NOT order if already ordered today.
    3. If location is 'Passed Office', it's too late to order.
    4. If 'Remote' or 'OOO', do not order.
    5. Choose 'Iced' for hot/sunny weather, 'Hot' for rainy/cold weather.
    6. Default to "Not ordering" if there is any uncertainty.
    7. Menu should be a specific beverage name (e.g., "Iced Americano", "Hot Latte").

    Return a JSON object with:
    - should_order: true/false
    - menu: String (beverage name)
    - confidence: Float (0 to 1)
    - reason: A concise explanation of the decision.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            should_order: { type: Type.BOOLEAN },
            menu: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reason: { type: Type.STRING },
          },
          required: ["should_order", "menu", "confidence", "reason"],
        },
      },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as AgentOutput;
  } catch (error) {
    console.error("Agent Decision Failed:", error);
    return {
      should_order: false,
      menu: "",
      confidence: 0,
      reason: "Error in decision engine: " + (error instanceof Error ? error.message : String(error))
    };
  }
}
