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

// Particle settings
const PARTICLE_COUNT = 512; // Must be power of 2 for FFT
const PARTICLE_SIZE = 2;

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  baseSize: number;
  color: string;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 0.5 + 0.2;
    this.vy = 0;
    this.life = 1;
    this.baseSize = Math.random() * PARTICLE_SIZE;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.life -= 0.005;
  }
}

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
  
  const particlesRef = useRef<Particle[]>([]);

  // Drawing function for the Neural Particle Spectrogram
  const draw = useCallback((fftValues: Float32Array, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const { width, height } = canvas;
    const particles = particlesRef.current;

    // Fade out effect
    context.fillStyle = 'rgba(13, 12, 29, 0.1)'; // Corresponds to dark theme bg
    context.fillRect(0, 0, width, height);
    
    // Draw a faint grid
    context.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    context.lineWidth = 0.5;
    for (let i = 0; i < width; i += 20) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, height);
      context.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      context.beginPath();
      context.moveTo(0, i);
      context.lineTo(width, i);
      context.stroke();
    }

    // Update and draw particles
    if (isPlaying) {
      fftValues.forEach((value, i) => {
        const amp = (value + 140) / 140; // Normalize amplitude
        if (amp > 0.3) {
            const freqPercent = i / fftValues.length;
            const y = height - (freqPercent * height);
            
            // Color based on frequency
            const hue = 200 + (freqPercent * 120); // Blue -> Magenta -> Cyan range
            const color = `hsl(${hue}, 100%, ${60 + amp * 30}%)`;

            particles.push(new Particle(0, y, color));
        }
      });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (p.life <= 0 || p.x > width) {
        particles.splice(i, 1);
      } else {
        context.beginPath();
        context.fillStyle = p.color;
        context.globalAlpha = p.life;
        context.arc(p.x, p.y, p.baseSize, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }, [isPlaying]);
  
  const scheduleStop = useCallback(() => {
    Tone.Transport.scheduleOnce(() => {
        setIsPlaying(false);
        onEnded();
    }, duration);
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
    
    fftRef.current = new Tone.FFT(PARTICLE_COUNT);
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
        draw(fftValues as Float32Array, canvas, context);
      } else {
        draw(new Float32Array(PARTICLE_COUNT), canvas, context);
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
      <CardContent className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 relative">
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
