'use server';
/**
 * @fileOverview A audio composition AI agent that translates data analysis into music theory.
 *
 * - composeAudioFromDataAnalysis - A function that handles the audio composition process.
 * - ComposeAudioFromDataAnalysisInput - The input type for the composeAudioFromDataAnalysis function.
 * - ComposeAudioFromDataAnalysisOutput - The return type for the composeAudioFromDataAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComposeAudioFromDataAnalysisInputSchema = z.object({
  analysis: z.string().describe('The detailed JSON analysis of the user input data.'),
});
export type ComposeAudioFromDataAnalysisInput = z.infer<typeof ComposeAudioFromDataAnalysisInputSchema>;

const ComposeAudioFromDataAnalysisOutputSchema = z.object({
  audioMapping: z.object({
    key: z.string().describe('The key of the composition (e.g., C minor).'),
    tempo: z.number().describe('The tempo of the composition in BPM.'),
    instrumentation: z.array(z.string()).describe('The instruments used in the composition.'),
    dataMapping: z.record(z.string(), z.any()).describe('The mapping of data values to musical notes (pitch, duration, velocity).'),
  }).describe('A detailed JSON object mapping data points to audio parameters.'),
});
export type ComposeAudioFromDataAnalysisOutput = z.infer<typeof ComposeAudioFromDataAnalysisOutputSchema>;

export async function composeAudioFromDataAnalysis(input: ComposeAudioFromDataAnalysisInput): Promise<ComposeAudioFromDataAnalysisOutput> {
  return composeAudioFromDataAnalysisFlow(input);
}

const promptTemplate = `You are an expert music composer translating data analysis into music theory.

You will make a series of AUTONOMOUS DECISIONS to translate the analysis into music theory. You will decide the key (e.g., C minor for negative sentiment), tempo, instrumentation (e.g., strings for smooth trends, percussive hits for outliers), and the precise mapping of data values to musical notes (pitch, duration, velocity).

Here is the data analysis:
{{{analysis}}}

Output the final audioMapping JSON object, which serves as the "sheet music".

CRITICAL: Your response must be a single, valid JSON object and nothing else. Do not include any explanatory text before or after the JSON.`;

const composeAudioFromDataAnalysisFlow = ai.defineFlow(
  {
    name: 'composeAudioFromDataAnalysisFlow',
    inputSchema: ComposeAudioFromDataAnalysisInputSchema,
    outputSchema: ComposeAudioFromDataAnalysisOutputSchema,
  },
  async input => {
    const prompt = {
      prompt: promptTemplate,
      input,
    }
    
    const generationConfig = {
      responseMimeType: 'application/json',
    };
    
    console.log("COMPOSER - PROMPT:", prompt.prompt);
    console.log("COMPOSER - CONFIG:", generationConfig);
    
    try {
      const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        ...prompt,
        config: generationConfig,
        output: {
          schema: ComposeAudioFromDataAnalysisOutputSchema,
        },
      });
      return output!;
    } catch (error) {
      console.error("ERROR in Composer Agent:", error);
      throw new Error(`Composer Agent failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
