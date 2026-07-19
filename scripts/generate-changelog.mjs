import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_PATH = fileURLToPath(new URL('../src/generated/changelog.json', import.meta.url));
const ENTRY_COUNT = 5;
const DELIMITER = '~~~';

function getChangelog() {
  try {
    // execFileSync (no shell) avoids platform-specific quoting issues with the
    // --pretty=format string, notably cmd.exe treating "|" as a pipe on Windows.
    const raw = execFileSync(
      'git',
      ['log', `-${ENTRY_COUNT}`, `--pretty=format:%h${DELIMITER}%ad${DELIMITER}%s`, '--date=short'],
      { encoding: 'utf-8' }
    );
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split('\n')
      .map((line) => {
        const [sha, date, summary] = line.split(DELIMITER);
        return { sha, date, summary };
      });
  } catch (error) {
    console.warn('Could not read git history for the changelog, falling back to an empty list:', error.message);
    return [];
  }
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(getChangelog(), null, 2));
console.log(`Wrote changelog (${ENTRY_COUNT} entries max) to ${OUTPUT_PATH}`);
