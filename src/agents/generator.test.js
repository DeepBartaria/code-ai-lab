import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEducationalContent } from './generator';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: function () {
      return globalThis.__mockGoogleGenAI();
    },
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' }
  };
});

describe('Generator Refinement logic', () => {
  let generateContentMock;

  beforeEach(() => {
    generateContentMock = vi.fn();
    globalThis.__mockGoogleGenAI = () => {
      return {
        models: {
          generateContent: generateContentMock
        }
      };
    };
  });

  it('should return parsed json if the initial output is fully valid', async () => {
    const validJson = {
      explanation: "Test explanation",
      mcqs: [{
        question: "Test Q?",
        options: ["A", "B", "C", "D"],
        answer: "A"
      }]
    };

    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify(validJson)
    });

    const result = await generateEducationalContent("fake-key", 4, "Maths");
    expect(result).toEqual(validJson);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('should auto-refine and retry if Zod validation fails (e.g. answer missing from options)', async () => {
    const invalidJson = {
      explanation: "Test explanation",
      mcqs: [{
        question: "Test Q?",
        options: ["X", "Y", "Z", "W"],
        answer: "A" // Not in options, will trigger Zod refinement
      }]
    };
    const validJson = {
      explanation: "Test explanation",
      mcqs: [{
        question: "Test Q?",
        options: ["A", "B", "C", "D"],
        answer: "A"
      }]
    };

    generateContentMock
      .mockResolvedValueOnce({ text: JSON.stringify(invalidJson) })
      .mockResolvedValueOnce({ text: JSON.stringify(validJson) });

    const result = await generateEducationalContent("fake-key", 4, "Maths");

    // It should have refined automatically
    expect(result).toEqual(validJson);
    expect(generateContentMock).toHaveBeenCalledTimes(2);

    const callArgs = generateContentMock.mock.calls[1][0];
    expect(callArgs.contents).toMatch(/failed strict structural validation/);
  });

  it('should throw an error if refinement keeps failing', async () => {
    const invalidJson = {
      explanation: "Test",
      mcqs: [{ question: "A", options: ["1"], answer: "1" }]
    };

    //invalid JSON consistently
    generateContentMock.mockResolvedValue({ text: JSON.stringify(invalidJson) });

    await expect(generateEducationalContent("fake-key", 4, "Maths")).rejects.toThrow(/failed to generate content: Validation failed after 2 retries/i);
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });
});
