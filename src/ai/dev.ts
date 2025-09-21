import { config } from 'dotenv';
config();

import '@/ai/flows/generate-timed-narrative.ts';
import '@/ai/flows/compose-audio-from-data-analysis.ts';
import '@/ai/flows/analyze-data-and-generate-insights.ts';