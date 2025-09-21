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

    const findNote = () => {
      const notes = composition.audioMapping.dataMapping;
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (currentTime >= note.time && currentTime < note.time + note.duration) {
          if (currentNote?.time !== note.time) {
            setCurrentNote(note);
          }
          return;
        }
      }
      setCurrentNote(null);
    };

    findNote();
  }, [currentTime, composition, currentNote]);

  return (
    <Card className={`mt-6`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Data Inspector</CardTitle>
        <Info className="h-4 w-4 text-[hsl(var(--luminous-primary))]" />
      </CardHeader>
      <CardContent>
        {currentNote ? (
          <div className="text-sm space-y-1 text-luminous-primary">
            <p><span className="font-semibold text-muted-foreground">Time:</span> {currentNote.time.toFixed(2)}s</p>
            <p><span className="font-semibold text-muted-foreground">Pitch:</span> {currentNote.note}</p>
            <p><span className="font-semibold text-muted-foreground">Duration:</span> {currentNote.duration.toFixed(2)}s</p>
            <p><span className="font-semibold text-muted-foreground">Source:</span> {currentNote.dataPoint}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {composition ? 'Play or scrub the waveform to inspect data points.' : 'No data to inspect.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
