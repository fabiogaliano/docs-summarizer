import { join, dirname, basename } from 'path';
import type { BookManifest, Chapter } from '../types';
import { EPUB_SPLITTER_PATH } from '../config';

export class EpubProcessor {
  private epubPath: string;
  private outputDir: string;

  constructor(epubPath: string, outputDir?: string) {
    this.epubPath = epubPath;
    this.outputDir = outputDir ?? this.defaultOutputDir();
  }

  private defaultOutputDir(): string {
    const dir = dirname(this.epubPath);
    const name = basename(this.epubPath, '.epub');
    return join(dir, name);
  }

  async ensureSplit(): Promise<void> {
    const manifestPath = join(this.outputDir, 'book.json');
    const manifestFile = Bun.file(manifestPath);

    if (await manifestFile.exists()) {
      return; // Already split
    }

    const proc = Bun.spawn(
      [EPUB_SPLITTER_PATH, this.epubPath, '-o', this.outputDir],
      { stdout: 'pipe', stderr: 'pipe' }
    );

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`epub-splitter failed: ${error}`);
    }
  }

  async getManifest(): Promise<BookManifest> {
    await this.ensureSplit();
    const manifestPath = join(this.outputDir, 'book.json');
    const manifest = await Bun.file(manifestPath).json();
    return manifest as BookManifest;
  }

  async getChapter(filename: string): Promise<Chapter> {
    const manifest = await this.getManifest();
    const info = manifest.chapters.find(c => c.file === filename);
    if (!info) {
      throw new Error(`Chapter not found: ${filename}`);
    }

    const chapterPath = join(this.outputDir, 'chapters', filename);
    const content = await Bun.file(chapterPath).text();

    return { info, content };
  }

  async getAllChapters(): Promise<Chapter[]> {
    const manifest = await this.getManifest();
    const chapters: Chapter[] = [];

    for (const info of manifest.chapters) {
      const chapterPath = join(this.outputDir, 'chapters', info.file);
      const content = await Bun.file(chapterPath).text();
      chapters.push({ info, content });
    }

    return chapters;
  }

  getOutputDir(): string {
    return this.outputDir;
  }
}
