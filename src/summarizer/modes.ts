import type { SummaryMode } from '../types';
import { getPrompt } from '../config';

export interface ModeConfig {
  chapterPrompt: string;
  bookPrompt: string;
}

export function getModeConfig(mode: SummaryMode): ModeConfig {
  return {
    chapterPrompt: getPrompt(mode, 'chapter'),
    bookPrompt: getPrompt(mode, 'book'),
  };
}
