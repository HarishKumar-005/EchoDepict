'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { NarrationScript } from '@/lib/types';
import { Loader2, Bot } from 'lucide-react';

type NarrationPanelProps = {
  script: NarrationScript | undefined;
  currentTime: number;
  isLoading: boolean;
};

export function NarrationPanel({ script, currentTime, isLoading }: NarrationPanelProps) {
  const activeLineRef = useRef<HTMLLIElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!script) return;

    let newActiveIndex = -1;
    // Find the index of the last script item whose timestamp is less than or equal to the current time
    for (let i = script.length - 1; i >= 0; i--) {
      if (currentTime >= script[i].timestamp) {
        newActiveIndex = i;
        break;
      }
    }
    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);
    }
  }, [currentTime, script, activeIndex]);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="font-semibold text-primary">Narrator is writing...</p>
        </div>
      );
    }

    if (!script || script.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-center px-4">
          <p>The AI-generated script will appear here, synchronized with the audio.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <ul className="space-y-5 p-1 pr-4">
          {script.map((line, index) => (
            <li
              key={line.timestamp}
              ref={index === activeIndex ? activeLineRef : null}
              className={cn(
                'transition-all duration-300 text-base leading-relaxed',
                index === activeIndex
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground opacity-60'
              )}
            >
              {line.text}
            </li>
          ))}
        </ul>
      </ScrollArea>
    );
  };


  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">AI Narration</CardTitle>
        <Bot className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
