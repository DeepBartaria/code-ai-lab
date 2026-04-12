import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

const ReviewerOutputSchema = z.object({
  status: z.enum(['pass', 'fail']),
  feedback: z.array(z.string()),
});

export async function reviewEducationalContent(apiKey, grade, generatorOutput, retryCount = 0) {
    if (!apiKey) throw new Error("API key is required");

    const ai = new GoogleGenAI({ apiKey });

    const contentString = JSON.stringify(generatorOutput);

    const prompt = `You are an expert Educational Reviewer scaling the quality of content for grade ${grade} students.
Review the following content carefully based on these criteria:
1. Age appropriateness (Is the language and complexity strictly suited for a grade ${grade} student?)
2. Conceptual correctness (Are there any factual errors or misleading explanations or MCQ answers?)
3. Clarity (Is it easy to understand and unambiguous?)

Content Output to Review:
${contentString}

Evaluate the content. If there are any flaws at all according to the criteria, set status to "fail" and provide a list of specific feedback strings (e.g., "Sentence 2 is too complex for Grade ${grade}", "Question 3 tests a concept not introduced in the explanation"). 
If the content perfectly meets all criteria, set status to "pass" and provide an empty feedlack array or a single positive feedback string.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            status: {
                type: Type.STRING,
                description: "Must be exactly 'pass' or 'fail'.",
            },
            feedback: {
                type: Type.ARRAY,
                description: "A list of strings explaining what needs to be improved.",
                items: {
                    type: Type.STRING,
                },
            },
        },
        required: ["status", "feedback"],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.1,
            }
        });

        let rawJson;
        try {
            rawJson = JSON.parse(response.text);
        } catch (err) {
            if (retryCount >= 2) throw err;
            console.warn("Reviewer output invalid JSON, retrying...");
            return reviewEducationalContent(apiKey, grade, generatorOutput, retryCount + 1);
        }

        const validationResult = ReviewerOutputSchema.safeParse(rawJson);
        if (!validationResult.success) {
            if (retryCount >= 2) {
                 throw new Error("Reviewer validation failed after 2 retries: " + validationResult.error.message);
            }
            console.warn("Reviewer Validation failed, retrying...");
            return reviewEducationalContent(apiKey, grade, generatorOutput, retryCount + 1);
        }

        return rawJson;
    } catch (error) {
        console.error("Reviewer Error:", error);
        throw new Error("Failed to review content: " + error.message);
    }
}
