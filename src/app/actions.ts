'use server';

import { analyzeDataAndGenerateInsights } from '@/ai/flows/analyze-data-and-generate-insights';
import { composeAudioFromDataAnalysis } from '@/ai/flows/compose-audio-from-data-analysis';
import { generateTimedNarrative } from '@/ai/flows/generate-timed-narrative';
import { z } from 'zod';
import type { Composition, Note } from '@/lib/types';

const InputSchema = z.object({
  type: z.enum(['csv', 'text']),
  data: z.string(),
});

type Input = z.infer<typeof InputSchema>;

/**
 * Parses the raw AI output for `dataMapping` into a structured array of Notes 
 * and calculates the total duration of the composition.
 * @param aiDataMapping - The raw `dataMapping` property from the Composer agent.
 * @param inputType - The type of user input ('csv' or 'text').
 * @param inputData - The original user input data string.
 * @returns An object containing the parsed notes array and the calculated duration.
 */
function parseDataMapping(
  aiDataMapping: unknown, 
  inputType: 'csv' | 'text', 
  inputData?: string
): { notes: Note[], duration: number } {
  // Validate that the AI output for dataMapping is an array.
  if (!Array.isArray(aiDataMapping)) {
    console.error("AI output for dataMapping was not an array:", aiDataMapping);
    throw new Error("Composer AI failed to generate a valid musical structure (expected an array).");
  }

  const notes: Note[] = [];
  let maxTime = 0; // Initialize maxTime to 0. This will store the final duration.
  const csvRows = inputType === 'csv' && inputData ? inputData.split('\n').map(row => row.split(',')) : null;

  aiDataMapping.forEach((item: any, index: number) => {
    // Basic validation for each note object.
    const time = Number(item.time);
    const duration = Number(item.duration);

    if (item.note && !isNaN(time) && !isNaN(duration)) {
        const note: Note = {
          time,
          note: item.note,
          duration,
          velocity: item.velocity ?? 0.8,
          // Assign source data for the Data Inspector.
          dataPoint: csvRows && csvRows.length > index + 1
            ? csvRows[index + 1].join(', ') 
            : `${inputType === 'text' ? 'Text segment' : 'Data point'} ${index + 1}`
        };
        notes.push(note);
        
        // Calculate the exact end time of the current note.
        const noteEndTime = note.time + note.duration;
        
        // If the current note's end time is greater than the maxTime seen so far, update maxTime.
        if (noteEndTime > maxTime) {
          maxTime = noteEndTime;
        }
    }
  });

  // Sort notes by their start time for correct playback scheduling.
  notes.sort((a, b) => a.time - b.time);
  
  // Return the parsed notes and the correctly calculated total duration.
  return { notes, duration: maxTime };
}


export async function runCompositionAgents(input: Input): Promise<{ success: true; data: Composition } | { success: false; error: string }> {
  try {
    const validatedInput = InputSchema.parse(input);
    
    console.log('--- STARTING AGENT WORKFLOW ---');

    // 1. Analyzer Agent
    console.log('1. ANALYZER AGENT - INPUT:', validatedInput);
    const analysisResult = await analyzeDataAndGenerateInsights({
      inputType: validatedInput.type,
      inputData: validatedInput.data,
    });
    const analysisJsonString = JSON.stringify(analysisResult.analysis);
    console.log('1. ANALYZER AGENT - OUTPUT:', analysisJsonString);

    // 2. Composer Agent
    console.log('2. COMPOSER AGENT - INPUT:', { analysis: analysisJsonString });
    const composerResult = await composeAudioFromDataAnalysis({
      analysis: analysisJsonString,
    });
    console.log('2. COMPOSER AGENT - OUTPUT:', composerResult);

    const { notes, duration } = parseDataMapping(composerResult.audioMapping.dataMapping, validatedInput.type, validatedInput.data);
    
    if (notes.length === 0) {
      const errorMsg = "The Composer AI failed to generate any valid musical notes. Please try a different input.";
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const audioMapping = {
        ...composerResult.audioMapping,
        dataMapping: notes,
        duration, // The correctly calculated total duration.
    };
    
    const narratorInput = {
      analysis: analysisJsonString,
      audioMapping: JSON.stringify(composerResult.audioMapping), // Send original mapping
    };

    // 3. Narrator Agent
    console.log('3. NARRATOR AGENT - INPUT:', narratorInput);
    const narratorResult = await generateTimedNarrative(narratorInput);
    console.log('3. NARRATOR AGENT - OUTPUT:', narratorResult);


    const composition: Composition = {
      audioMapping,
      narrationScript: narratorResult,
    };
    
    console.log('--- AGENT WORKFLOW COMPLETE ---');
    console.log('FINAL COMPOSITION OBJECT:', composition);

    return { success: true, data: composition };
  } catch (e) {
    console.error("AGENT WORKFLOW FAILED:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during AI composition.';
    return { success: false, error: errorMessage };
  }
}
