import type { Chapter, SummaryMode, ProviderOptions } from '../types';
import type { SummaryProvider } from '../providers';
import { getModeConfig } from './modes';

export interface ChapterSummary {
  index: number;
  title: string;
  filename: string;
  summary: string;
}

export class ChapterSummarizer {
  private provider: SummaryProvider;
  private mode: SummaryMode;
  private options: ProviderOptions;

  constructor(
    provider: SummaryProvider,
    mode: SummaryMode,
    options: ProviderOptions = {}
  ) {
    this.provider = provider;
    this.mode = mode;
    this.options = options;
  }

  async summarize(chapter: Chapter): Promise<ChapterSummary> {
    const config = await getModeConfig(this.mode);

    const prompt = config.chapterPrompt
      .replace('{{TITLE}}', chapter.info.title)
      .replace('{{CONTENT}}', chapter.content);

    const summary = await this.provider.summarize(
      chapter.content,
      prompt,
      this.options
    );

    return {
      index: chapter.info.index,
      title: chapter.info.title,
      filename: chapter.info.file.replace('.md', ''),
      summary,
    };
  }

  async summarizeAll(
    chapters: Chapter[],
    onProgress?: (current: number, total: number, title: string) => void
  ): Promise<ChapterSummary[]> {
    const summaries: ChapterSummary[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      onProgress?.(i + 1, chapters.length, chapter.info.title);

      const summary = await this.summarize(chapter);
      summaries.push(summary);
    }

    return summaries;
  }
}
