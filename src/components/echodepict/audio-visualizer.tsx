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
  
  const draw = useCallback((fftValues: Float32Array, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const barWidth = (width / fftValues.length) * 1.5;
    let x = 0;

    const primaryHsl = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const primaryColor = `hsl(${primaryHsl})`;

    // "Aurora" effect
    const data = fftValues.map(v => (v + 140) / 140); // Normalize

    // Base Wave (Lows)
    context.fillStyle = 'rgba(75, 0, 130, 0.2)'; // Indigo
    context.beginPath();
    context.moveTo(0, height);
    for (let i = 0; i < data.length; i++) {
        const lowFreq = data.slice(0, data.length / 4);
        const avg = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length;
        const y = height - (avg * height * 0.3) - Math.sin(i * 0.1 + Date.now() * 0.001) * 10;
        context.lineTo(i * (width / data.length), y);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fill();

    // Mid-Range Waves
    const waveGradient = context.createLinearGradient(0, height * 0.4, 0, height);
    waveGradient.addColorStop(0, `hsla(${primaryHsl}, 0.5)`); // Cyan
    waveGradient.addColorStop(1, 'rgba(255, 0, 255, 0.3)'); // Magenta
    
    context.fillStyle = waveGradient;
    context.beginPath();
    context.moveTo(0, height);
     for (let i = 0; i < data.length; i++) {
        const midFreq = data.slice(data.length / 4, data.length / 2);
        const avg = midFreq.reduce((a, b) => a + b, 0) / midFreq.length;
        const y = height - (data[i] * height * 0.5) - (avg * height * 0.2) + Math.sin(i * 0.2 + Date.now() * 0.002) * 5;
        context.lineTo(i * (width / data.length), y);
    }
    context.lineTo(width, height);
    context.closePath();
    context.fill();


    // Sparkle Particles (Highs)
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const highFreqData = data.slice(data.length / 2);
    highFreqData.forEach((val, i) => {
        if (val > 0.8) { // If high frequency is loud
            const x = Math.random() * width;
            const y = (1 - (i / highFreqData.length)) * height * 0.8;
            const size = Math.random() * 2;
            context.fillRect(x, y, size, size);
        }
    });

  }, []);
  
  const scheduleStop = useCallback(() => {
    if (duration > 0) {
      Tone.Transport.scheduleOnce(() => {
        Tone.Transport.stop();
        setIsPlaying(false);
        onEnded();
      }, duration);
    }
  }, [duration, setIsPlaying, onEnded]);

  // Setup Tone.js instruments and effects
  useEffect(() => {
    if (!composition?.audioMapping) return;

    partRef.current?.dispose();
    synthRef.current?.dispose();

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'amsine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).toDestination();
    
    fftRef.current = new Tone.FFT(FFT_SIZE);
    Tone.getDestination().connect(fftRef.current);
    
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
    if (!isPlaying) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
      if (Tone.Transport.state !== 'started') {
        setCurrentTime(0); // Reset time only if transport is fully stopped
      }
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const loop = () => {
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

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
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
      if (Tone.Transport.seconds >= duration) {
        Tone.Transport.seconds = 0;
      }
      scheduleStop();
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [composition, setIsPlaying, scheduleStop, duration]);

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
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="font-semibold text-primary">Agents are composing...</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-4 border-t border-border/50 bg-background/50">
        <div className="w-full flex items-center gap-4 px-2">
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
              {isMuted || volume === 0 ? <VolumeX className="text-primary" /> : <Volume2 className="text-primary" />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={(v) => {setVolume(v[0]); setIsMuted(false);}}
              className="w-24"
              disabled={!composition || isLoading}
            />
          </div>
          <Button size="lg" onClick={handlePlayPause} disabled={!composition || isLoading} className="w-32 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-[0_0_15px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.7)] transition-shadow rounded-full">
            {isPlaying ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <div className="w-[72px]"></div> {/* Spacer */}
        </div>
      </CardFooter>
    </Card>
  );
}
