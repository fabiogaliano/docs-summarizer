import type { SummaryMode, ProviderOptions } from '../types';
import type { SummaryProvider } from '../providers';
import type { ChapterSummary } from './chapter-summarizer';
import { getModeConfig } from './modes';

export interface BookSummary {
  title: string;
  author: string;
  summary: string;
  chapterCount: number;
}

export class BookSummarizer {
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

  async summarize(
    chapterSummaries: ChapterSummary[],
    bookTitle: string,
    bookAuthor: string
  ): Promise<BookSummary> {
    const config = await getModeConfig(this.mode);

    // Combine chapter summaries with headers
    const combinedSummaries = chapterSummaries
      .map(cs => `## ${cs.title}\n\n${cs.summary}`)
      .join('\n\n---\n\n');

    const prompt = config.bookPrompt
      .replace('{{TITLE}}', bookTitle)
      .replace('{{AUTHOR}}', bookAuthor)
      .replace('{{CHAPTER_COUNT}}', String(chapterSummaries.length));

    const summary = await this.provider.summarize(
      combinedSummaries,
      prompt,
      this.options
    );

    return {
      title: bookTitle,
      author: bookAuthor,
      summary,
      chapterCount: chapterSummaries.length,
    };
  }
}
