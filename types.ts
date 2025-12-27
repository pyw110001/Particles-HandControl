export enum AppMode {
  DEMO = 'DEMO',
  INTERACTIVE = 'INTERACTIVE',
  LOADING_MODEL = 'LOADING_MODEL'
}

export interface ColorTheme {
  name: string;
  start: string; // Hex
  mid: string;   // Hex
  end: string;   // Hex
}

export interface HandGestureState {
  isHandDetected: boolean;
  isOpen: boolean; // true = open palm, false = fist
  expansionFactor: number; // 0.0 (closed) to 1.0 (open)
  rotation: number; // Rotation in radians
}

export type ThemeGeneratorStatus = 'IDLE' | 'GENERATING' | 'ERROR' | 'SUCCESS';