export type NarrationScriptItem = {
  timestamp: number;
  text: string;
};

export type NarrationScript = NarrationScriptItem[];

export type Note = {
  time: number;
  note: string;
  duration: number;
  velocity: number;
  dataPoint?: any;
};

export type AudioMapping = {
  key: string;
  tempo: number;
  instrumentation: string[];
  dataMapping: Note[];
  duration: number; 
};

export type Composition = {
  audioMapping: AudioMapping;
  narrationScript: NarrationScript;
};
