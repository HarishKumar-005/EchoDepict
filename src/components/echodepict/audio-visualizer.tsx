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

// Neuronal Web specific settings
const NODE_COUNT = 64; // Number of nodes, corresponds to FFT bins
const MIN_NODE_RADIUS = 1;
const MAX_NODE_RADIUS = 4;
const CONNECTION_DISTANCE = 100; // Max distance to draw a connection
const BREATHING_SPEED = 0.5; // Radians per second
const BREATHING_AMOUNT = 0.02; // How much it scales

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

  // Refs for Neuronal Web visualizer
  const nodesRef = useRef<any[]>([]);
  const lastBreathTime = useRef(0);
  const breathAngle = useRef(0);

  // Initialize nodes for the neuronal web
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && nodesRef.current.length === 0) {
        const tempNodes = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            tempNodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: MIN_NODE_RADIUS,
                targetGlow: 0,
                currentGlow: 0,
            });
        }
        nodesRef.current = tempNodes;
    }
  }, []); // Run only once

  const draw = useCallback((fftValues: Float32Array, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const primaryHslRaw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const primaryHsl = primaryHslRaw.split(' ').join(','); // Add commas for correct format

    const now = performance.now();
    if (lastBreathTime.current === 0) lastBreathTime.current = now;
    const deltaTime = (now - lastBreathTime.current) / 1000;
    lastBreathTime.current = now;
    
    breathAngle.current += BREATHING_SPEED * deltaTime;
    const breathScale = 1 + Math.sin(breathAngle.current) * BREATHING_AMOUNT;

    context.save();
    context.translate(width / 2, height / 2);
    context.scale(breathScale, breathScale);
    context.translate(-width / 2, -height / 2);

    const nodes = nodesRef.current;

    // Update node glow based on FFT
    for (let i = 0; i < NODE_COUNT; i++) {
        const fftIndex = Math.floor(i * (fftValues.length / NODE_COUNT));
        const value = (fftValues[fftIndex] + 140) / 100; // Normalize
        nodes[i].targetGlow = Math.max(0, Math.min(1, value));
        nodes[i].currentGlow += (nodes[i].targetGlow - nodes[i].currentGlow) * 0.2; // Smoothing
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONNECTION_DISTANCE) {
                const combinedGlow = (nodes[i].currentGlow + nodes[j].currentGlow) / 2;
                context.beginPath();
                context.moveTo(nodes[i].x, nodes[i].y);
                context.lineTo(nodes[j].x, nodes[j].y);
                context.strokeStyle = `hsla(${primaryHsl}, ${Math.max(0.05, combinedGlow * 0.5)})`;
                context.lineWidth = 0.5 + combinedGlow;
                context.stroke();
            }
        }
    }

    // Draw nodes
    nodes.forEach(node => {
        // Draw main node
        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fillStyle = `hsla(${primaryHsl}, ${0.5 + node.currentGlow * 0.5})`;
        context.fill();

        // Draw glow
        if (node.currentGlow > 0.1) {
            const glowRadius = node.radius + node.currentGlow * 15;
            const grad = context.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, glowRadius);
            grad.addColorStop(0, `hsla(${primaryHsl}, ${node.currentGlow * 0.8})`);
            grad.addColorStop(1, `hsla(${primaryHsl}, 0)`);
            context.fillStyle = grad;
            context.beginPath();
            context.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
            context.fill();
        }
    });

    context.restore();
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

    // Cleanup previous instances
    partRef.current?.dispose();
    synthRef.current?.dispose();
    fftRef.current?.dispose();
    Tone.Transport.cancel(); // Clear all scheduled events

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
    
    // Resize canvas to fit container
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
            // Re-initialize nodes on resize
            const tempNodes = [];
            for (let i = 0; i < NODE_COUNT; i++) {
                tempNodes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: MIN_NODE_RADIUS,
                    targetGlow: 0,
                    currentGlow: 0,
                });
            }
            nodesRef.current = tempNodes;
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
        draw(new Float32Array(FFT_SIZE).fill(-140), canvas, context);
        if (currentTime !== 0) {
          setCurrentTime(0);
        }
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
    };
  }, [isPlaying, draw, setCurrentTime, currentTime]);

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
