import { z } from 'zod';

const ReviewerOutputSchema = z.object({
  status: z.enum(['pass', 'fail']),
  feedback: z.array(z.string()),
});

export async function reviewEducationalContent(apiKey, grade, generatorOutput, retryCount = 0) {
    // Use the OpenRouter API key from Environment Variables
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "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";

    const contentString = JSON.stringify(generatorOutput);

    const prompt = `You are an expert Educational Reviewer scaling the quality of content for grade ${grade} students.
Review the following content carefully based on these criteria:
1. Age appropriateness (Is the language and complexity strictly suited for a grade ${grade} student?)
2. Conceptual correctness (Are there any factual errors or misleading explanations or MCQ answers?)
3. Clarity (Is it easy to understand and unambiguous?)

Content Output to Review:
${contentString}

Evaluate the content. If there are any flaws at all according to the criteria, set status to "fail" and provide a list of specific feedback strings (e.g., "Sentence 2 is too complex for Grade ${grade}", "Question 3 tests a concept not introduced in the explanation"). 
If the content perfectly meets all criteria, set status to "pass" and provide an empty feedback array or a single positive feedback string.`;

    const systemPrompt = `You are an AI assistant. You MUST return ONLY a valid JSON object. 
Do not include markdown formatting like \`\`\`json or any other text before or after the JSON.
Your JSON must strictly conform to this schema:
{
  "status": "pass or fail",
  "feedback": ["Array of feedback strings"]
}`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        let content = responseData.choices?.[0]?.message?.content || "";

        // Cleanup potential markdown or conversational text
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match) {
            content = match[1].trim();
        }
        const startIdx = content.indexOf('{');
        const endIdx = content.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            content = content.substring(startIdx, endIdx + 1);
        }

        let rawJson;
        try {
            rawJson = JSON.parse(content);
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
