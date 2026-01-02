
export interface AnalysisResult {
  fullSummary: string;
  podcastSegments: {
    startTime: string;
    endTime: string;
    title: string;
    description: string;
    reasoning: string;
  }[];
  lectureThemes: string[];
}

export type ProcessingStep = 'idle' | 'uploading' | 'cleaning' | 'analyzing' | 'completed' | 'error';

export interface FileData {
  name: string;
  size: number;
  base64: string;
  type: string;
}
