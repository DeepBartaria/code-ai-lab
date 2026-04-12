import { generateEducationalContent } from './generator';
import { reviewEducationalContent } from './reviewer';

export async function* runAgentPipeline(apiKey, grade, topic) {
    try {
        yield { step: 'GENERATING_DRAFT', message: 'Generating draft educational content...' };

        const draftContent = await generateEducationalContent(apiKey, grade, topic);
        yield { step: 'REVIEWING_DRAFT', message: 'Assessing the draft content...', payload: draftContent };

        const reviewResult = await reviewEducationalContent(apiKey, grade, draftContent);

        if (reviewResult.status === 'pass') {
            yield {
                step: 'COMPLETED',
                message: 'Content approved by the Reviewer Agent.',
                finalContent: draftContent,
                review: reviewResult
            };
            return;
        }

       
        yield {
            step: 'REFINING_CONTENT',
            message: 'Reviewer failed the content. Refining based on feedback...',
            payload: draftContent,
            review: reviewResult
        };

        const refinedContent = await generateEducationalContent(apiKey, grade, topic, reviewResult.feedback);

        
        yield {
            step: 'COMPLETED',
            message: 'Pipeline finished (1 refinement pass completed).',
            finalContent: refinedContent,
            review: reviewResult,
            isRefined: true
        };

    } catch (error) {
        yield { step: 'ERROR', message: error.message };
    }
}
