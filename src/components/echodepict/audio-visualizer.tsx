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
  const particlesRef = useRef<any[]>([]);
  
  const draw = useCallback((fftValues: Float32Array, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    // Style colors from CSS
    const primaryHsl = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const primaryColor = `hsl(${primaryHsl})`;
    const isDarkMode = document.documentElement.classList.contains('dark');

    const numBars = fftValues.length;
    const barWidth = width / numBars;
    const centerY = height / 2;

    // Draw center line
    context.strokeStyle = isDarkMode ? `hsl(${primaryHsl} / 0.2)`: `hsl(${primaryHsl} / 0.4)`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, centerY);
    context.lineTo(width, centerY);
    context.stroke();

    const particles = particlesRef.current;
    
    // Draw frequency bars and update particles
    for (let i = 0; i < numBars; i++) {
        const value = (fftValues[i] + 140) / 140; // Normalize dB range
        const barHeight = Math.max(0, value * centerY * 1.2);
        
        const x = i * barWidth;
        
        // Gradient for bars
        const gradient = context.createLinearGradient(x, centerY, x, centerY - barHeight);
        gradient.addColorStop(0, isDarkMode ? 'hsl(222.2 84% 4.9% / 0)' : 'hsl(210 40% 98% / 0)');
        gradient.addColorStop(1, primaryColor);

        context.fillStyle = gradient;

        // Draw upper bar (treble)
        context.fillRect(x, centerY - barHeight, barWidth, barHeight);
        
        // Draw lower bar (bass) - mirrored
        context.fillRect(x, centerY, barWidth, barHeight);
        
        // Particle emission
        if (barHeight > centerY * 0.7 && Math.random() > 0.95) {
            particles.push({
                x: x + barWidth / 2,
                y: centerY - barHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 1,
                radius: Math.random() * 1.5 + 0.5,
                alpha: 1
            });
        }
    }

    // Update and draw particles
    context.fillStyle = primaryColor;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        } else {
            context.globalAlpha = p.alpha;
            context.beginPath();
            context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    context.globalAlpha = 1;

  }, []);
  
  const scheduleStop = useCallback(() => {
    if (duration > 0) {
      Tone.Transport.scheduleOnce(() => {
        setIsPlaying(false);
        onEnded();
        Tone.Transport.stop(); // Explicitly stop transport
      }, duration);
    }
  }, [duration, setIsPlaying, onEnded]);

  // Setup Tone.js instruments and effects
  useEffect(() => {
    if (!composition?.audioMapping) return;

    // Cleanup previous instances
    partRef.current?.dispose();
    synthRef.current?.dispose();
    fftRef.current?.dispose();
    Tone.Transport.cancel(); // Clear all scheduled events

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'amsine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).toDestination();
    
    fftRef.current = new Tone.FFT({
        size: FFT_SIZE,
        smoothing: 0.8
    });
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
        if (fftValues instanceof Float32Array) {
            draw(fftValues, canvas, context);
        }
      }

      animationFrameId.current = requestAnimationFrame(loop);
    };

    if (isPlaying) {
        animationFrameId.current = requestAnimationFrame(loop);
    } else {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = undefined;
        }
        // Clear canvas when not playing
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

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
      // If playback finished, reset time before starting
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
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="font-semibold text-primary">Agents are composing...</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-4 border-t">
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
          <Button size="lg" onClick={handlePlayPause} disabled={!composition || isLoading} className="w-32 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-full">
            {isPlaying ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <div className="w-[72px]"></div> {/* Spacer */}
        </div>
      </CardFooter>
    </Card>
  );
}
