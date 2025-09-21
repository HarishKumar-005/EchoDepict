'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Composition, Note } from '@/lib/types';
import { Info } from 'lucide-react';

type DataInspectorProps = {
  currentTime: number;
  composition: Composition | null;
};

export function DataInspector({ currentTime, composition }: DataInspectorProps) {
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!composition?.audioMapping.dataMapping) {
      setCurrentNote(null);
      return;
    }

    // This effect is for highlighting based on scrubbing, not continuous playback.
    const findNote = () => {
      const notes = composition.audioMapping.dataMapping;
      // Find the last note that started before or at the current time
      const lastNote = [...notes].reverse().find(note => currentTime >= note.time);
      
      if (lastNote) {
        // Check if the current time is within the duration of that note
        if (currentTime < lastNote.time + lastNote.duration) {
          if (currentNote?.time !== lastNote.time) {
            setCurrentNote(lastNote);
          }
          return;
        }
      }
      setCurrentNote(null);
    };

    findNote();
  }, [currentTime, composition, currentNote]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Data Inspector</CardTitle>
        <Info className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-2">
        {currentNote ? (
          <div className="text-sm space-y-1 text-foreground">
            <p><span className="font-medium text-muted-foreground w-16 inline-block">Time:</span> {currentNote.time.toFixed(2)}s</p>
            <p><span className="font-medium text-muted-foreground w-16 inline-block">Pitch:</span> {currentNote.note}</p>
            <p><span className="font-medium text-muted-foreground w-16 inline-block">Duration:</span> {currentNote.duration.toFixed(2)}s</p>
            <p><span className="font-medium text-muted-foreground w-16 inline-block">Source:</span> {currentNote.dataPoint}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            {composition ? 'Scrub the waveform to inspect data points.' : 'No data to inspect.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
