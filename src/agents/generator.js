import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

const GeneratorOutputSchema = z.object({
  explanation: z.string(),
  mcqs: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4, "Must have exactly 4 options"),
      answer: z.string(),
    })
  ),
}).superRefine((data, ctx) => {
  data.mcqs.forEach((mcq, idx) => {
    if (!mcq.options.includes(mcq.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `MCQ ${idx + 1}: The correct answer "${mcq.answer}" must exactly match one of the provided options.`,
        path: ["mcqs", idx, "answer"],
      });
    }
  });
});

export async function generateEducationalContent(apiKey, grade, topic, feedback = null, retryCount = 0) {
  if (!apiKey) throw new Error("API key is required");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = feedback
    ? `You are an educational content creator for grade ${grade}. 
You previously generated content for the topic: "${topic}". 
The Reviewer Agent or Auto-Validator provided the following feedback:
${feedback.join('\n')}

Refine your generated content based on this feedback while ensuring it remains highly educational, age-appropriate, and strictly follows the required JSON output.`
    : `You are an expert educational content creator for grade ${grade}. 
Generate draft educational content for the topic: "${topic}".
Language must precisely match the grade level.
Concepts must be completely correct and easy to understand.
Do not include any conversational filler, output ONLY the requested JSON format.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      explanation: {
        type: Type.STRING,
        description: "A clear, compelling explanation of the topic suited for the specified grade level.",
      },
      mcqs: {
        type: Type.ARRAY,
        description: "A list of multiple choice questions.",
        items: {
          type: Type.OBJECT,
          properties: {
            question: {
              type: Type.STRING,
              description: "The question text.",
            },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "An array of exactly 4 options.",
            },
            answer: {
              type: Type.STRING,
              description: "The correct option (must exactly match one of the string items in 'options').",
            },
          },
          required: ["question", "options", "answer"],
        },
      },
    },
    required: ["explanation", "mcqs"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.2,
      }
    });

    let rawJson;
    try {
      rawJson = JSON.parse(response.text);
    } catch (err) {
      if (retryCount >= 2) throw err;
      return generateEducationalContent(apiKey, grade, topic, ["Invalid JSON format or missing closing brackets. Output strictly valid JSON without markdown wrapping."], retryCount + 1);
    }

    const validationResult = GeneratorOutputSchema.safeParse(rawJson);

    if (!validationResult.success) {
      if (retryCount >= 2) {
        throw new Error("Validation failed after 2 retries: " + validationResult.error.message);
      }
      
      const errorStrings = validationResult.error.issues ? validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`) : [validationResult.error.message];
      console.warn("Zod validation failed, refining content...", errorStrings);
      
      const refinementPrompt = [
        "Your previous JSON output failed strict structural validation. You MUST fix these errors:",
        ...errorStrings,
        "Make sure options has exactly 4 items, and the correct answer string strictly exists within the options array."
      ];
      
      return generateEducationalContent(apiKey, grade, topic, refinementPrompt, retryCount + 1);
    }

    return rawJson;
  } catch (error) {
    console.error("Generator Error:", error);
    throw new Error("Failed to generate content: " + error.message);
  }
}
