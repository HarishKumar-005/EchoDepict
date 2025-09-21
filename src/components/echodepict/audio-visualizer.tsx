'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { Composition } from '@/lib/types';

type AudioVisualizerProps = {
  composition: Composition | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  isLoading: boolean;
  onEnded: () => void;
};

const FFT_SIZE = 256;

export function AudioVisualizer({
  composition,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  duration,
  isLoading,
  onEnded,
}: AudioVisualizerProps) {
  const isAudioReady = useRef(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const fftRef = useRef<Tone.FFT | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number>();

  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);

  // "Horizon Line" visualizer
  const draw = useCallback((fftValues: Float32Array, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const { width, height } = canvas;
    const center_y = height / 2;
    context.clearRect(0, 0, width, height);

    // Get theme colors
    const primaryHsl = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const primaryColor = `hsl(${primaryHsl})`;
    const luminousPrimaryHsl = getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim();
    const horizonColor = `hsl(${luminousPrimaryHsl})`;

    // Draw Horizon Line
    context.beginPath();
    context.moveTo(0, center_y);
    context.lineTo(width, center_y);
    context.strokeStyle = horizonColor;
    context.lineWidth = 1;
    context.stroke();

    // Prepare for glow effect
    context.shadowBlur = 8;
    context.shadowColor = primaryColor;
    
    context.fillStyle = primaryColor;
    const barWidth = width / (fftValues.length / 2);

    // Draw mirrored bars
    for (let i = 0; i < fftValues.length / 2; i++) {
        // Normalize FFT value to a range of 0-1
        const value = (fftValues[i] + 140) / 100; // Adjusted for better visual range
        const barHeight = Math.max(0, Math.min(value * height * 0.4, height * 0.4));

        // Draw bar going upwards (treble)
        if (i > fftValues.length / 4) {
            context.fillRect(i * barWidth, center_y - barHeight, barWidth, barHeight);
        } else {
            // Draw bar going downwards (bass)
            context.fillRect(i * barWidth, center_y, barWidth, barHeight);
        }
    }
    
    // Reset glow for other elements
    context.shadowBlur = 0;
  }, []);
  
  const scheduleStop = useCallback(() => {
    if (duration > 0) {
        Tone.Transport.scheduleOnce((time) => {
            Tone.Draw.schedule(() => {
                setIsPlaying(false);
                onEnded();
                Tone.Transport.stop();
            }, time);
        }, duration);
    }
  }, [duration, setIsPlaying, onEnded]);

  // Setup Tone.js instruments and effects
  useEffect(() => {
    if (!composition?.audioMapping) return;

    partRef.current?.dispose();
    synthRef.current?.dispose();
    fftRef.current?.dispose();
    Tone.Transport.cancel();

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'amsine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    });
    
    fftRef.current = new Tone.FFT({
        size: FFT_SIZE,
        smoothing: 0.8
    });
    
    if(synthRef.current && fftRef.current){
        synthRef.current.connect(fftRef.current);
        fftRef.current.toDestination();
    }
    
    partRef.current = new Tone.Part((time, value) => {
      synthRef.current?.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, composition.audioMapping.dataMapping).start(0);

    Tone.Transport.bpm.value = composition.audioMapping.tempo;

    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      partRef.current?.dispose();
      synthRef.current?.dispose();
      fftRef.current?.dispose();
    };
  }, [composition]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
        }
    });
    resizeObserver.observe(canvas);

    let loop: () => void;

    if (isPlaying) {
      loop = () => {
        if (Tone.Transport.state === 'started') {
          setCurrentTime(Tone.Transport.seconds);
        }

        if (fftRef.current) {
          const fftValues = fftRef.current.getValue();
          if (fftValues instanceof Float32Array) {
              draw(fftValues, canvas, context);
          }
        }
        animationFrameId.current = requestAnimationFrame(loop);
      };
      animationFrameId.current = requestAnimationFrame(loop);
    } else {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = undefined;
        }
        // Set a default "idle" state for the visualizer
        context.clearRect(0, 0, canvas.width, canvas.height);
        draw(new Float32Array(FFT_SIZE / 2).fill(-140), canvas, context);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
    };
  }, [isPlaying, draw, setCurrentTime]);

  const handlePlayPause = useCallback(async () => {
    if (!composition) return;
    
    if (!isAudioReady.current) {
      await Tone.start();
      isAudioReady.current = true;
      console.log('AudioContext started');
    }
    
    if (Tone.Transport.state === 'started') {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= duration) {
        setCurrentTime(0);
        Tone.Transport.seconds = 0;
      }
      scheduleStop();
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [composition, setIsPlaying, scheduleStop, duration, currentTime, setCurrentTime]);

  const handleScrubberChange = useCallback((value: number[]) => {
      if (!composition || duration <= 0) return;
      const newTime = (value[0] / 100) * duration;
      Tone.Transport.seconds = newTime;
      setCurrentTime(newTime);
  }, [composition, duration, setCurrentTime]);

  useEffect(() => {
    const db = isMuted ? -Infinity : (volume / 100) * 30 - 30;
    if (Tone.getDestination().volume) {
      Tone.getDestination().volume.rampTo(db, 0.1);
    }
  }, [volume, isMuted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <Card className="h-full flex flex-col justify-between overflow-hidden">
      <CardContent className="flex-1 flex items-center justify-center p-0 relative">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground z-10">
            <Loader2 className="h-10 w-10 md:h-16 md:w-16 animate-spin text-primary" />
            <p className="font-semibold text-primary">Agents are composing...</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 md:gap-3 p-2 md:p-4 border-t">
        <div className="w-full flex items-center gap-2 md:gap-4 px-1 md:px-2">
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleScrubberChange}
            disabled={!composition || isLoading}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(duration)}</span>
        </div>
        <div className="w-full flex justify-between items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" disabled={!composition || isLoading} onClick={() => setIsMuted(!isMuted)} className="w-8 h-8 md:w-10 md:h-10">
              {isMuted || volume === 0 ? <VolumeX className="text-primary" /> : <Volume2 className="text-primary" />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={(v) => {setVolume(v[0]); setIsMuted(false);}}
              className="w-16 md:w-24"
              disabled={!composition || isLoading}
            />
          </div>
          <Button size="lg" onClick={handlePlayPause} disabled={!composition || isLoading} className="w-28 md:w-32 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base md:text-lg rounded-full h-10 md:h-11">
            {isPlaying ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <div className="w-[40px] md:w-[72px]"></div> {/* Spacer */}
        </div>
      </CardFooter>
    </Card>
  );
}
