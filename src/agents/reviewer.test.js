import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewEducationalContent } from './reviewer';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: function() {
      return globalThis.__mockGoogleGenAI();
    },
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' }
  };
});

describe('Reviewer Refinement logic', () => {
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
      status: "pass",
      feedback: ["Looks perfect!"]
    };

    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify(validJson)
    });

    const result = await reviewEducationalContent("fake-key", 4, { content: "Test" });
    expect(result).toEqual(validJson);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('should retry if zod validation fails (e.g. invalid status)', async () => {
    const invalidJson = {
      status: "good", // invalid enum, should be pass or fail
      feedback: ["Nice"]
    };
    const validJson = {
      status: "pass",
      feedback: ["Nice"]
    };

    generateContentMock
      .mockResolvedValueOnce({ text: JSON.stringify(invalidJson) })
      .mockResolvedValueOnce({ text: JSON.stringify(validJson) });

    const result = await reviewEducationalContent("fake-key", 4, { content: "Test" });
    
    expect(result).toEqual(validJson);
    // 1 initial call + 1 retry = 2 calls
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
