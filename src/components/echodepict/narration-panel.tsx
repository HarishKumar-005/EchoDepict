'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { NarrationScript } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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
            <p>Narrator is writing...</p>
        </div>
      );
    }

    if (!script || script.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-center">
          <p>Narration script will appear here.</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <ul className="space-y-6 p-1 pr-4">
          {script.map((line, index) => (
            <li
              key={line.timestamp}
              ref={index === activeIndex ? activeLineRef : null}
              className={cn(
                'transition-all duration-300 text-lg leading-relaxed',
                index === activeIndex
                  ? 'text-primary font-semibold scale-105'
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
      <CardHeader>
        <CardTitle>AI Narration</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
