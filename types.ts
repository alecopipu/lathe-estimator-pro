
export interface MachiningOperation {
  name: string;
  description: string;
  estimatedTimeSeconds: number;
  toolType: string;
  rpm?: number;
  feedRate?: number;
}

export interface EstimationResult {
  partName: string;
  material: string;
  stockDiameter: string;
  stockInnerDiameter?: string; // Added field for Inner Diameter
  stockLength: string;
  operations: MachiningOperation[];
  totalTimeSeconds: number;
  difficultyRating: 'Low' | 'Medium' | 'High';
  notes: string;
  sideMode?: string; // '1-left', '1-right', '1-complete', '2'
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
