/**
 * Shared helper for reading/writing the repo's tools-data.js catalog file
 * from Node scripts (used by the tool-submission GitHub Action).
 *
 * tools-data.js has the form:
 *   window.OEW_TOOLS_DATA = { ...JSON... };
 * We extract the JSON object between the first `{` and the last `}` to
 * parse it, and reconstruct the same wrapper when writing it back so the
 * file stays loadable as a plain <script> in the browser.
 */
import fs from 'node:fs';
import path from 'node:path';

const PREFIX_RE = /^([\s\S]*?window\.OEW_TOOLS_DATA\s*=\s*)([\s\S]*?)(;\s*)$/;

export function catalogFilePath(repoRoot) {
  return path.join(repoRoot, 'tools-data.js');
}

export function readCatalog(repoRoot) {
  const filePath = catalogFilePath(repoRoot);
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(PREFIX_RE);
  if (!match) {
    throw new Error('tools-data.js does not match the expected "window.OEW_TOOLS_DATA = { ... };" format.');
  }
  const catalog = JSON.parse(match[2]);
  return { catalog, source, prefix: match[1], suffix: match[3] };
}

export function writeCatalog(repoRoot, catalog, { prefix, suffix } = {}) {
  const filePath = catalogFilePath(repoRoot);
  const head = prefix || 'window.OEW_TOOLS_DATA = ';
  const tail = suffix || ';\n';
  fs.writeFileSync(filePath, `${head}${JSON.stringify(catalog, null, 2)}${tail}`, 'utf8');
}
