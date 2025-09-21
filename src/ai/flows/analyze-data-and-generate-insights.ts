'use server';
/**
 * @fileOverview Analyzes user-provided CSV or text input using the Gemini model to identify trends, patterns, and sentiment.
 *
 * - analyzeDataAndGenerateInsights - A function that handles the data analysis and insights generation process.
 * - AnalyzeDataAndGenerateInsightsInput - The input type for the analyzeDataAndGenerateInsights function.
 * - AnalyzeDataAndGenerateInsightsOutput - The return type for the analyzeDataAndGenerateInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDataAndGenerateInsightsInputSchema = z.object({
  inputType: z.enum(['csv', 'text']).describe('The type of input data: csv or text.'),
  inputData: z.string().describe('The CSV data or text input.'),
});
export type AnalyzeDataAndGenerateInsightsInput = z.infer<
  typeof AnalyzeDataAndGenerateInsightsInputSchema
>;

const AnalyzeDataAndGenerateInsightsOutputSchema = z.object({
  analysis: z.object({
    summary: z.string().describe('A summary of the analysis.'),
    trends: z.string().describe('Identified trends in the data.'),
    patterns: z.string().describe('Identified patterns in the data.'),
    sentiment: z.string().describe('Sentiment analysis of the data.'),
  }),
});
export type AnalyzeDataAndGenerateInsightsOutput = z.infer<
  typeof AnalyzeDataAndGenerateInsightsOutputSchema
>;

export async function analyzeDataAndGenerateInsights(
  input: AnalyzeDataAndGenerateInsightsInput
): Promise<AnalyzeDataAndGenerateInsightsOutput> {
  return analyzeDataAndGenerateInsightsFlow(input);
}

const promptTemplate = `You are a data analysis expert. Analyze the following {{inputType}} data and generate insights, identifying trends, patterns, and sentiment.

Data: {{{inputData}}}

CRITICAL: Your response must be a single, valid JSON object and nothing else. Do not include any explanatory text before or after the JSON.`;

const analyzeDataAndGenerateInsightsFlow = ai.defineFlow(
  {
    name: 'analyzeDataAndGenerateInsightsFlow',
    inputSchema: AnalyzeDataAndGenerateInsightsInputSchema,
    outputSchema: AnalyzeDataAndGenerateInsightsOutputSchema,
  },
  async input => {
    
    const generationConfig = {
      responseMimeType: 'application/json',
    };
    
    const fullPrompt = promptTemplate
      .replace('{{inputType}}', input.inputType)
      .replace('{{{inputData}}}', input.inputData);

    console.log("ANALYZER - PROMPT:", fullPrompt);
    console.log("ANALYZER - CONFIG:", generationConfig);

    try {
      const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: fullPrompt,
        config: generationConfig,
        output: {
          schema: AnalyzeDataAndGenerateInsightsOutputSchema,
        },
      });
      return output!;
    } catch (error) {
      console.error("ERROR in Analyzer Agent:", error);
      // Re-throw the error to be caught by the main action handler
      throw new Error(`Analyzer Agent failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
