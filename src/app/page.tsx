'use client';

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast"
import type { Composition } from '@/lib/types';
import { Header } from '@/components/echodepict/header';
import { InputDashboard } from '@/components/echodepict/input-dashboard';
import { AudioVisualizer } from '@/components/echodepict/audio-visualizer';
import { DataInspector } from '@/components/echodepict/data-inspector';
import { NarrationPanel } from '@/components/echodepict/narration-panel';
import { runCompositionAgents } from './actions';
import { Card } from '@/components/ui/card';
import { BotMessageSquare, BrainCircuit } from 'lucide-react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [composition, setComposition] = useState<Composition | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const { toast } = useToast();

  const handleCompose = async (input: { type: 'csv' | 'text', data: string }) => {
    if (!input.data) {
      toast({
        variant: 'destructive',
        title: 'Input Required',
        description: 'Please provide data or a concept to compose.',
      });
      return;
    }

    setIsLoading(true);
    setComposition(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const result = await runCompositionAgents(input);

    if (result.success) {
      setComposition(result.data);
      setDuration(result.data.audioMapping.duration);
      toast({
        title: 'Composition Complete',
        description: 'Your audio soundscape is ready to be played.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Composition Failed',
        description: result.error,
      });
    }
    setIsLoading(false);
  };

  const resetState = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground font-body antialiased">
      <Header />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6 overflow-hidden">
        {/* Left Panel */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-0">
          <InputDashboard onCompose={handleCompose} isLoading={isLoading} />
        </div>
        
        {/* Center & Right Panels */}
        <div className="lg:col-span-9 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
          {/* Center Panel */}
          <div className="lg:col-span-2 flex flex-col h-full min-h-0">
            {composition || isLoading ? (
              <>
                <AudioVisualizer 
                  composition={composition}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  duration={duration}
                  isLoading={isLoading}
                  onEnded={resetState}
                />
                <DataInspector currentTime={currentTime} composition={composition} />
              </>
            ) : (
               <Card className={`h-full min-h-[300px] lg:min-h-0 flex flex-col items-center justify-center text-center p-8 border-dashed`}>
                  <BrainCircuit className="h-16 w-16 text-primary mb-4" style={{ filter: 'drop-shadow(0 0 5px hsl(var(--primary)/0.5))' }} />
                  <h3 className="text-2xl font-semibold text-primary mb-2" style={{ textShadow: '0 0 8px hsl(var(--primary)/0.3)' }}>Aetherium Studio</h3>
                  <p className="text-muted-foreground">Your generated audio landscape will appear here. <br/> Start by providing data or a concept.</p>
               </Card>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 flex flex-col h-full min-h-0">
             {composition || isLoading ? (
                <NarrationPanel 
                  script={composition?.narrationScript} 
                  currentTime={currentTime} 
                  isLoading={isLoading}
                />
             ) : (
                <Card className={`h-full min-h-[200px] lg:min-h-0 flex flex-col items-center justify-center text-center p-8 border-dashed`}>
                  <BotMessageSquare className="h-16 w-16 text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">AI Narrator</h3>
                  <p className="text-muted-foreground">The AI-generated script will be displayed here, synchronized with the audio.</p>
                </Card>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
