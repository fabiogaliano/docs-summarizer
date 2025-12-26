import { join } from 'path';
import type { SummaryMode } from '../types';
import { PROMPTS_DIR } from '../config';

export interface ModeConfig {
  chapterPrompt: string;
  bookPrompt: string;
}

async function loadPrompt(mode: SummaryMode, type: 'chapter' | 'book'): Promise<string> {
  const path = join(PROMPTS_DIR, mode, `${type}.txt`);
  return Bun.file(path).text();
}

export async function getModeConfig(mode: SummaryMode): Promise<ModeConfig> {
  const [chapterPrompt, bookPrompt] = await Promise.all([
    loadPrompt(mode, 'chapter'),
    loadPrompt(mode, 'book'),
  ]);

  return { chapterPrompt, bookPrompt };
}
