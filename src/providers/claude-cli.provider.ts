import type { SummaryProvider } from './types';
import type { ProviderOptions } from '../types';
import { getDefaultModel } from '../config';

export class ClaudeCLIProvider implements SummaryProvider {
  name = 'claude-cli';

  async summarize(
    content: string,
    prompt: string,
    options?: ProviderOptions
  ): Promise<string> {
    const model = options?.model ?? getDefaultModel();

    const proc = Bun.spawn(
      ['claude', '-p', '--model', model, prompt],
      {
        stdin: new Response(content),
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const output = await new Response(proc.stdout).text();
    const error = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Claude CLI failed: ${error}`);
    }

    return output.trim();
  }
}
