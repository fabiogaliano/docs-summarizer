import { resolve, join, basename } from 'path';
import { readdir, stat } from 'fs/promises';
import type { SummarizeOptions, SummaryMode, ProviderType, Chapter, ChapterInfo } from './types';
import { EpubProcessor } from './epub/processor';
import { getContentChapters } from './epub/chapter-finder';
import { createProvider } from './providers';
import { createUI } from './ui';
import { ChapterSummarizer } from './summarizer/chapter-summarizer';
import { BookSummarizer } from './summarizer/book-summarizer';
import { OutputWriter } from './output/writer';
import { DEFAULT_MODEL } from './config';

// Parse CLI arguments
function parseArgs(): SummarizeOptions | null {
  const args = Bun.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return null;
  }

  // First arg should be 'summarize' command or a path
  let pathArg: string;
  let restArgs: string[];

  if (args[0] === 'summarize') {
    pathArg = args[1];
    restArgs = args.slice(2);
  } else {
    // Allow omitting 'summarize' command
    pathArg = args[0];
    restArgs = args.slice(1);
  }

  if (!pathArg) {
    console.error('Error: No path provided');
    printHelp();
    return null;
  }

  const options: SummarizeOptions = {
    path: resolve(pathArg),
    mode: 'concise',
    provider: 'claude-cli',
    model: DEFAULT_MODEL,
    skipExisting: false,
    interactive: false,
  };

  // Parse remaining args
  for (let i = 0; i < restArgs.length; i++) {
    const arg = restArgs[i];
    const next = restArgs[i + 1];

    switch (arg) {
      case '-o':
      case '--output':
        options.output = next ? resolve(next) : undefined;
        i++;
        break;
      case '-m':
      case '--mode':
        if (next === 'concise' || next === 'detailed') {
          options.mode = next;
          i++;
        }
        break;
      case '--provider':
        if (next) {
          options.provider = next as ProviderType;
          i++;
        }
        break;
      case '--model':
        if (next) {
          options.model = next;
          i++;
        }
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
      case '-i':
      case '--interactive':
        options.interactive = true;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
docs-summarizer - Summarize documents and books using AI

Usage:
  bun run src/index.ts <path>              Summarize epub file or folder
  bun run src/index.ts summarize <path>    Same as above

Options:
  -o, --output <dir>     Output directory (default: same as epub)
  -m, --mode <mode>      Summary mode: concise (default) or detailed
  --provider <provider>  AI provider: claude-cli (default)
  --model <model>        Model to use (default: haiku)
  --skip-existing        Skip if summaries already exist
  -i, --interactive      Interactively select chapters to summarize
  -h, --help             Show this help

Examples:
  bun run src/index.ts ./book.epub
  bun run src/index.ts ./books/ --mode detailed
  bun run src/index.ts ./book.epub -i              # Interactive chapter selection
  bun run src/index.ts ./book.epub -m concise --model sonnet
`);
}

async function findEpubFiles(path: string): Promise<string[]> {
  const pathStat = await stat(path);

  if (pathStat.isFile()) {
    if (path.endsWith('.epub')) {
      return [path];
    }
    throw new Error(`Not an epub file: ${path}`);
  }

  if (pathStat.isDirectory()) {
    const files = await readdir(path);
    return files
      .filter(f => f.endsWith('.epub'))
      .map(f => join(path, f));
  }

  throw new Error(`Invalid path: ${path}`);
}

async function summarizeBook(
  epubPath: string,
  options: SummarizeOptions
): Promise<void> {
  const bookName = basename(epubPath, '.epub');
  console.log(`\nProcessing: ${bookName}`);

  // Initialize processor
  const processor = new EpubProcessor(epubPath, options.output);
  const outputDir = processor.getOutputDir();

  // Check if already summarized
  if (options.skipExisting) {
    const summaryPath = join(outputDir, `summary-${options.mode}.md`);
    if (await Bun.file(summaryPath).exists()) {
      console.log(`  Skipping (summary exists)`);
      return;
    }
  }

  // Get manifest and find content chapters
  console.log('  Reading book structure...');
  const manifest = await processor.getManifest();
  const autoSelectedChapters = getContentChapters(manifest.chapters);
  const autoSelectedIndices = autoSelectedChapters.map(c => c.index);

  // Let user select chapters if interactive mode
  const ui = createUI(options.interactive);
  const selectedIndices = await ui.selectChapters(manifest.chapters, autoSelectedIndices);

  if (selectedIndices.length === 0) {
    console.log('  No chapters selected, skipping');
    return;
  }

  // Filter to selected chapters
  const selectedChapterInfos = manifest.chapters.filter(c => selectedIndices.includes(c.index));
  const skippedCount = manifest.chapters.length - selectedChapterInfos.length;

  console.log(`  ${selectedChapterInfos.length} chapters to summarize (skipped ${skippedCount})`);

  // Load selected chapters
  const chapters: Chapter[] = [];
  for (const info of selectedChapterInfos) {
    const chapterPath = join(outputDir, 'chapters', info.file);
    const content = await Bun.file(chapterPath).text();
    chapters.push({ info, content });
  }

  // Initialize components
  const provider = createProvider(options.provider);
  const chapterSummarizer = new ChapterSummarizer(provider, options.mode, { model: options.model });
  const bookSummarizer = new BookSummarizer(provider, options.mode, { model: options.model });
  const writer = new OutputWriter(outputDir, options.mode);

  // Summarize chapters
  console.log('  Summarizing chapters...');
  const chapterSummaries = await chapterSummarizer.summarizeAll(
    chapters,
    (current, total, title) => {
      console.log(`     [${current}/${total}] ${title}`);
    }
  );

  // Write chapter summaries
  await writer.writeChapterSummaries(chapterSummaries);

  // Create book summary
  console.log('  Creating book summary...');
  const bookTitle = manifest.title ?? bookName;
  const bookAuthor = manifest.author ?? 'Unknown';
  const bookSummary = await bookSummarizer.summarize(
    chapterSummaries,
    bookTitle,
    bookAuthor
  );

  // Write book summary
  const summaryPath = await writer.writeBookSummary(bookSummary);

  console.log(`  Done! Summary: ${summaryPath}`);
}

async function main(): Promise<void> {
  const options = parseArgs();
  if (!options) {
    process.exit(0);
  }

  try {
    const epubFiles = await findEpubFiles(options.path);

    if (epubFiles.length === 0) {
      console.error('No epub files found');
      process.exit(1);
    }

    console.log(`Found ${epubFiles.length} book(s) to summarize`);
    console.log(`Mode: ${options.mode} | Provider: ${options.provider} | Model: ${options.model}`);

    for (const epubPath of epubFiles) {
      await summarizeBook(epubPath, options);
    }

    console.log('\nAll done!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
