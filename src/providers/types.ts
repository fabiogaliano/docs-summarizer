import type { ProviderOptions } from '../types';

export interface SummaryProvider {
  name: string;
  summarize(content: string, prompt: string, options?: ProviderOptions): Promise<string>;
}
