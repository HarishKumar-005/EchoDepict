'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const waveformRef = useRef<Tone.Waveform | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number>();
  
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const isAudioReady = useRef(false);
  const [audioIntensity, setAudioIntensity] = useState(0);

  const draw = useCallback((waveformValues: Float32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    
    // Create fill gradient
    const fillGradient = context.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, `hsl(var(--primary))`);
    fillGradient.addColorStop(1, 'transparent');

    context.beginPath();
    context.fillStyle = fillGradient;

    const sliceWidth = width * 1.0 / waveformValues.length;
    let x = 0;

    context.moveTo(0, height / 2);
    for (let i = 0; i < waveformValues.length; i++) {
      const v = waveformValues[i] * 0.8; // scale down
      const y = v * height/2 + height / 2;
      context.lineTo(x, y);
      x += sliceWidth;
    }
    context.lineTo(width, height / 2);
    context.closePath();
    context.fill();
    
    // Glowing top line
    context.beginPath();
    context.lineWidth = 1.5;
    context.strokeStyle = 'hsl(var(--luminous-primary))';
    context.shadowBlur = 5;
    context.shadowColor = 'hsl(var(--luminous-primary))';
    
    x=0;
    for (let i = 0; i < waveformValues.length; i++) {
        const v = waveformValues[i] * 0.8;
        const y = v * height/2 + height / 2;
        if (i === 0) {
            context.moveTo(x, y);
        } else {
            context.lineTo(x, y);
        }
        x += sliceWidth;
    }
    context.stroke();
    
    // Reset shadow
    context.shadowBlur = 0;
  }, []);

  const scheduleStop = useCallback(() => {
    Tone.Transport.scheduleOnce(() => {
        setIsPlaying(false);
        onEnded();
    }, duration);
  }, [duration, setIsPlaying, onEnded]);

  useEffect(() => {
    if (!composition?.audioMapping) return;

    partRef.current?.dispose();
    synthRef.current?.dispose();

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'amsine' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();
    waveformRef.current = new Tone.Waveform(1024);
    Tone.Destination.connect(waveformRef.current);
    
    partRef.current = new Tone.Part((time, value) => {
      synthRef.current?.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, composition.audioMapping.dataMapping).start(0);

    Tone.Transport.bpm.value = composition.audioMapping.tempo;

    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      partRef.current?.dispose();
      synthRef.current?.dispose();
    };
  }, [composition]);

  useEffect(() => {
    const loop = () => {
      if (Tone.Transport.state === 'started') {
        setCurrentTime(Tone.Transport.seconds);
        if (waveformRef.current) {
          const values = waveformRef.current.getValue();
          draw(values);
          const max = Math.max(...Array.from(values).map(v => Math.abs(v)));
          setAudioIntensity(Math.min(max * 2, 1)); // Amplify for better visual effect
        }
      } else {
        setAudioIntensity(intensity => Math.max(0, intensity - 0.05)); // Fade out glow
      }
      animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [draw, setCurrentTime]);

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
      scheduleStop();
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [composition, setIsPlaying, scheduleStop]);

  const handleScrubberChange = useCallback((value: number[]) => {
      if (!composition) return;
      const newTime = (value[0] / 100) * duration;
      Tone.Transport.seconds = newTime;
      setCurrentTime(newTime);
      
      if (Tone.Transport.state === 'started') {
          Tone.Transport.clear(partRef.current?.id);
          scheduleStop();
      }

  }, [composition, duration, setCurrentTime, scheduleStop]);

  useEffect(() => {
    const db = isMuted ? -Infinity : (volume / 100) * 30 - 30;
    Tone.getDestination().volume.rampTo(db, 0.1);
  }, [volume, isMuted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const cardStyle = {
    '--audio-intensity': audioIntensity,
    boxShadow: `0 0 25px hsl(var(--primary) / var(--audio-intensity))`,
    transition: 'box-shadow 0.1s ease-out'
  } as React.CSSProperties;

  return (
    <Card className={`h-full flex flex-col justify-between`} style={cardStyle}>
      <CardContent className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="font-semibold text-[hsl(var(--luminous-primary))]">Agents are composing...</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-4">
        <div className="w-full flex items-center gap-4">
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleScrubberChange}
            disabled={!composition || isLoading}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(duration)}</span>
        </div>
        <div className="w-full flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled={!composition || isLoading} onClick={() => setIsMuted(!isMuted)}>
              {isMuted || volume === 0 ? <VolumeX className="text-[hsl(var(--luminous-primary))]" /> : <Volume2 className="text-[hsl(var(--luminous-primary))]" />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={(v) => {setVolume(v[0]); setIsMuted(false);}}
              className="w-24"
              disabled={!composition || isLoading}
            />
          </div>
          <Button size="lg" onClick={handlePlayPause} disabled={!composition || isLoading} className="w-32 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-[0_0_15px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.7)] transition-shadow">
            {isPlaying ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <div className="w-[72px]"></div> {/* Spacer */}
        </div>
      </CardFooter>
    </Card>
  );
}
