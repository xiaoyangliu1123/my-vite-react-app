export interface Transcription {
  id: string;
  audioUrl: string;
  originalText: string;
  enhancedText: string;
  tags: string[];
  createdAt: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 