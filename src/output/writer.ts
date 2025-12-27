import { join } from 'path';
import { mkdir } from 'fs/promises';
import type { SummaryMode } from '../types';
import type { ChapterSummary } from '../summarizer/chapter-summarizer';
import type { BookSummary } from '../summarizer/book-summarizer';

export class OutputWriter {
  private baseDir: string;
  private mode: SummaryMode;

  constructor(baseDir: string, mode: SummaryMode) {
    this.baseDir = baseDir;
    this.mode = mode;
  }

  private get summariesDir(): string {
    return join(this.baseDir, 'summaries', this.mode);
  }

  async ensureDirectories(): Promise<void> {
    await mkdir(this.summariesDir, { recursive: true });
  }

  async writeChapterSummary(summary: ChapterSummary): Promise<string> {
    await this.ensureDirectories();

    const filename = `${String(summary.index).padStart(2, '0')}_${this.slugify(summary.title)}.md`;
    const filepath = join(this.summariesDir, filename);

    const content = `# ${summary.title}\n\n${summary.summary}\n`;
    await Bun.write(filepath, content);

    return filepath;
  }

  async writeChapterSummaries(summaries: ChapterSummary[]): Promise<string[]> {
    const paths: string[] = [];
    for (const summary of summaries) {
      const path = await this.writeChapterSummary(summary);
      paths.push(path);
    }
    return paths;
  }

  async writeBookSummary(summary: BookSummary): Promise<string> {
    const filename = `summary-${this.mode}.md`;
    const filepath = join(this.baseDir, filename);

    const content = `# ${summary.title}\n\n*By ${summary.author}*\n\n${summary.summary}\n`;
    await Bun.write(filepath, content);

    return filepath;
  }

  async writeCombinedSummary(
    chapterSummaries: ChapterSummary[],
    bookTitle: string,
    bookAuthor: string,
    bookSummary: BookSummary | null = null
  ): Promise<string> {
    const filename = `${this.slugify(bookTitle)}-summary-${this.mode}.md`;
    const filepath = join(this.baseDir, filename);

    let content = `# ${bookTitle}\n\n`;
    content += `*By ${bookAuthor}*\n\n`;

    if (bookSummary) {
      content += `## Overview\n\n${bookSummary.summary}\n\n`;
      content += `---\n\n## Chapter Summaries\n\n`;
    }

    for (const chapter of chapterSummaries) {
      content += `## ${chapter.title}\n\n${chapter.summary}\n\n`;
    }

    await Bun.write(filepath, content);
    return filepath;
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
