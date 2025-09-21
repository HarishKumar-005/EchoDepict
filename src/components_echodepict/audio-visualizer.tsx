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

  // Drawing function for the frequency bar visualizer
  const draw = useCallback((fftValues: Float32Array, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const primaryHsl = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const primaryColor = `hsl(${primaryHsl})`;
    
    // Create a gradient for the bars
    const gradient = context.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, `hsl(260, 80%, 30%)`); // Magenta/Purple at bottom
    gradient.addColorStop(1, primaryColor); // Glowing blue at top

    const barWidth = width / fftValues.length;

    fftValues.forEach((value, i) => {
      // Convert decibels to a normalized value (0 to 1)
      const normalized = (value + 140) / 140; // Assuming dB range is approx -140 to 0
      const barHeight = Math.max(0, normalized * height);

      context.fillStyle = gradient;
      context.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    });
  }, []);
  
  // Schedules the stop event at the end of the composition's duration.
  const scheduleStop = useCallback(() => {
    if (duration > 0) {
      Tone.Transport.scheduleOnce(() => {
        // This callback is executed by the audio engine at the precise time.
        onEnded();
        Tone.Transport.stop(); // This fully stops the transport and resets its clock.
      }, duration);
    }
  }, [duration, onEnded]);


  // Setup Tone.js instruments and effects when a new composition is loaded.
  useEffect(() => {
    if (!composition?.audioMapping) return;

    // Cleanup previous instances to prevent memory leaks.
    partRef.current?.dispose();
    synthRef.current?.dispose();
    fftRef.current?.dispose();
    Tone.Transport.cancel(); // Clear all previously scheduled events.

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'amsine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
    }).toDestination();
    
    // Use FFT for frequency analysis instead of Waveform.
    fftRef.current = new Tone.FFT({
        size: FFT_SIZE,
        smoothing: 0.8
    }).to(Tone.getDestination());
    
    synthRef.current.connect(fftRef.current);
    
    partRef.current = new Tone.Part((time, value) => {
      synthRef.current?.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, composition.audioMapping.dataMapping).start(0);

    Tone.Transport.bpm.value = composition.audioMapping.tempo;

    return () => {
      // Full cleanup when the component unmounts.
      Tone.Transport.stop();
      Tone.Transport.cancel();
      partRef.current?.dispose();
      synthRef.current?.dispose();
      fftRef.current?.dispose();
    };
  }, [composition]);


  // Animation loop for drawing the visualizer.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    let loop: () => void;

    if (isPlaying) {
      // If playing, start the animation loop.
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
      // If not playing, cancel any existing animation frame.
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
      // When playback stops, reset the timer to 0 and clear the canvas.
      if (currentTime !== 0) {
        setCurrentTime(0);
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      // Cleanup: cancel the animation frame when the effect dependencies change.
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying, draw, setCurrentTime, currentTime]);

  const handlePlayPause = useCallback(async () => {
    if (!composition) return;
    
    // Initialize AudioContext on the first user interaction (play click).
    if (!isAudioReady.current) {
      await Tone.start();
      isAudioReady.current = true;
      console.log('AudioContext started');
    }
    
    if (Tone.Transport.state === 'started') {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      // If playback finished, ensure time is reset before starting.
      if (currentTime >= duration) {
        setCurrentTime(0);
        Tone.Transport.seconds = 0;
      }
      scheduleStop(); // Schedule the end of the track.
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
      <CardFooter className="flex flex-col gap-2 md:gap-3 p-4 border-t">
        <div className="w-full flex items-center gap-2 md:gap-4">
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleScrubberChange}
            disabled={!composition || isLoading}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground tabular-nums">{formatTime(duration)}</span>
        </div>
        <div className="w-full flex justify-between items-center">
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
