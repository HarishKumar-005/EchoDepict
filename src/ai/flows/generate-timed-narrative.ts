'use server';
/**
 * @fileOverview Generates a timed script that explains the audio in sync, providing a compelling narrative of the data.
 *
 * - generateTimedNarrative - A function that generates a timed narrative.
 * - GenerateTimedNarrativeInput - The input type for the generateTimedNarrative function.
 * - GenerateTimedNarrativeOutput - The return type for the generateTimedNarrative function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTimedNarrativeInputSchema = z.object({
  analysis: z.string().describe('The analysis of the data.'),
  audioMapping: z.string().describe('The mapping of data values to musical notes.'),
});
export type GenerateTimedNarrativeInput = z.infer<
  typeof GenerateTimedNarrativeInputSchema
>;

const NarrationScriptItemSchema = z.object({
  timestamp: z.number().describe('The timestamp of the narration item.'),
  text: z.string().describe('The text of the narration item.'),
});

const GenerateTimedNarrativeOutputSchema = z.array(
  NarrationScriptItemSchema
);

export type GenerateTimedNarrativeOutput = z.infer<
  typeof GenerateTimedNarrativeOutputSchema
>;

export async function generateTimedNarrative(
  input: GenerateTimedNarrativeInput
): Promise<GenerateTimedNarrativeOutput> {
  return generateTimedNarrativeFlow(input);
}

const promptTemplate = `You are an AI narrator, creating a compelling, human-readable story of the data, in sync with the generated audio.

  You will receive the analysis of the data, and the audio mapping that translates data points into musical elements.

  Synthesize the information to generate a timed script (an array of objects), where each object has a timestamp (in seconds) and the text to be spoken at that time.

  Make sure the script explains to the user what they are hearing, and why it is significant, for example: "At 15 seconds, the sharp piano stabs represent the Q4 sales spike we identified."

  Analysis: {{{analysis}}}
  Audio Mapping: {{{audioMapping}}}

  Output the narration script as a JSON array of objects with timestamp and text properties.  For example:
  [
    { "timestamp": 0.5, "text": "The data begins its ascent..." },
    { "timestamp": 2.1, "text": "Notice the anomaly here." }
  ]

  CRITICAL: Your response must be a single, valid JSON object (an array) and nothing else. Do not include any explanatory text before or after the JSON.
  `;

const generateTimedNarrativeFlow = ai.defineFlow(
  {
    name: 'generateTimedNarrativeFlow',
    inputSchema: GenerateTimedNarrativeInputSchema,
    outputSchema: GenerateTimedNarrativeOutputSchema,
  },
  async input => {
    const generationConfig = {
      responseMimeType: 'application/json',
    };
    
    const fullPrompt = promptTemplate
      .replace('{{{analysis}}}', input.analysis)
      .replace('{{{audioMapping}}}', input.audioMapping);

    console.log("NARRATOR - PROMPT:", fullPrompt);
    console.log("NARRATOR - CONFIG:", generationConfig);

    try {
      const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: fullPrompt,
        config: generationConfig,
        output: {
          schema: GenerateTimedNarrativeOutputSchema,
        },
      });
      return output!;
    } catch (error) {
      console.error("ERROR in Narrator Agent:", error);
      throw new Error(`Narrator Agent failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
