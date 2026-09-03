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
  // Use the OpenRouter API key from Environment Variables
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "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";

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

  const systemPrompt = `You are an AI assistant. You MUST return ONLY a valid JSON object. 
Do not include markdown formatting like \`\`\`json or any other text before or after the JSON.
Your JSON must strictly conform to this schema:
{
  "explanation": "A clear, compelling explanation of the topic suited for the specified grade level.",
  "mcqs": [
    {
      "question": "The question text.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option (must exactly match one of the string items in 'options')."
    }
  ]
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
        temperature: 0.2
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
      return generateEducationalContent(apiKey, grade, topic, ["Invalid JSON format or missing closing brackets. Output strictly valid JSON without markdown wrapping."], retryCount + 1);
    }

    const validationResult = GeneratorOutputSchema.safeParse(rawJson);

    if (!validationResult.success) {
      if (retryCount >= 2) {
        throw new Error("Validation failed after 2 retries: " + validationResult.error.message);
      }
      
      const errorStrings = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
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
