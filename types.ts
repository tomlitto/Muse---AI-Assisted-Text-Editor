export interface FileAttachment {
  name: string;
  type: string;
  data: string; // Base64
}

export interface Suggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  startIndex?: number; // Approximate index for potential highlighting
}

export enum EditorMode {
  WRITING = 'WRITING',
  GENERATING = 'GENERATING',
  REVIEWING = 'REVIEWING'
}

export interface GenerationRequest {
  prompt: string;
  attachments: FileAttachment[];
}