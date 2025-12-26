import { join, dirname } from 'path';

// Front matter terms to skip (before book content starts)
export const FRONT_MATTER = [
  'cover',
  'title page',
  'title',
  'copyright',
  'dedication',
  'contents',
  'table of contents',
  'also by',
  'about the author',
  'praise for',
  'endorsements',
  'epigraph',
];

// Terms that indicate book content is starting
export const INTRO_TERMS = [
  'introduction',
  'preface',
  'prologue',
  'foreword',
  'acknowledgments',
  'acknowledgements',
];

// Minimum word count to consider a chapter as content (not front matter)
export const MIN_CONTENT_WORDS = 100;

// Default model
export const DEFAULT_MODEL = 'haiku';

// Path to epub-splitter binary
export const EPUB_SPLITTER_PATH = join(
  dirname(dirname(import.meta.dir)),
  'epub-splitter/target/release/epub-splitter'
);

// Prompts directory
export const PROMPTS_DIR = join(dirname(import.meta.dir), 'prompts');
