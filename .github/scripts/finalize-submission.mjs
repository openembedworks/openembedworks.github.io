#!/usr/bin/env node
/**
 * Combines the AI review verdict with the rule-validated proposed tool.
 * On approval: inserts the tool into tools-data.js and bumps the service-worker
 * cache version (so the change is visible without a hard refresh), then
 * writes the files a later workflow step needs (PR body, branch name).
 * On rejection: writes an issue comment explaining the AI's concerns.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readCatalog, writeCatalog } from './tools-data-io.mjs';

const repoRoot = process.cwd();
const tmpDir = process.env.RUNNER_TEMP || repoRoot;
const issueNumber = process.env.ISSUE_NUMBER || '';
const proposedToolFile = process.env.PROPOSED_TOOL_FILE;
const rawAiResponse = process.env.AI_RESPONSE || '';

function setOutput(key, value) {
  const outPath = process.env.GITHUB_OUTPUT;
  const delimiter = `EOF_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(outPath, `${key}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function writeFile(name, contents) {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, contents, 'utf8');
  return filePath;
}

function parseAiVerdict(raw) {
  const stripped = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.approve !== 'boolean') return null;
    return {
      approve: parsed.approve,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    };
  } catch {
    return null;
  }
}

const proposedTool = JSON.parse(fs.readFileSync(proposedToolFile, 'utf8'));
const verdict = parseAiVerdict(rawAiResponse);

if (!verdict) {
  setOutput('proceed', 'false');
  const commentPath = writeFile('final-comment.md', [
    '### AI review could not be completed',
    '',
    "The AI reviewer's response could not be parsed, so this submission was not auto-merged.",
    'A maintainer needs to review it manually.',
  ].join('\n'));
  setOutput('comment_file', commentPath);
  process.exit(0);
}

if (!verdict.approve) {
  setOutput('proceed', 'false');
  const commentPath = writeFile('final-comment.md', [
    '### AI review flagged this submission',
    '',
    'The submission passed rule-based checks but was flagged by automated review:',
    '',
    ...(verdict.reasons.length ? verdict.reasons.map(r => `- ${r}`) : ['- No specific reason was provided.']),
    '',
    'A maintainer will take a look. You can also edit this issue to address the concerns above.',
  ].join('\n'));
  setOutput('comment_file', commentPath);
  process.exit(0);
}

// Approved: apply the change to tools-data.js.
const { catalog, prefix, suffix } = readCatalog(repoRoot);
catalog.tools.push(proposedTool);
writeCatalog(repoRoot, catalog, { prefix, suffix });

// Bump the service worker cache version so the new tool shows up without a hard refresh.
const swPath = path.join(repoRoot, 'sw.js');
const swSource = fs.readFileSync(swPath, 'utf8');
const bumpedSw = swSource.replace(
  /const CACHE_VERSION = 'v(\d+)';/,
  (_, n) => `const CACHE_VERSION = 'v${Number(n) + 1}';`
);
fs.writeFileSync(swPath, bumpedSw, 'utf8');

const branch = `tool-submission/issue-${issueNumber}`;
setOutput('proceed', 'true');
setOutput('branch', branch);
setOutput('pr_title', `Request new tool: ${proposedTool.name}`);

const prBodyPath = writeFile('pr-body.md', [
  `Closes #${issueNumber}`,
  '',
  `Adds **${proposedTool.name}** to the \`${proposedTool.category}\` category.`,
  '',
  'Validated automatically:',
  '- Rule-based checks (mandatory fields, category, https URL, no duplicate id/url, checklist confirmations)',
  '- AI review (client-side claim, spam/malicious content, category fit)',
  '',
  verdict.reasons.length ? `AI notes: ${verdict.reasons.join('; ')}` : 'AI review: no concerns noted.',
  '',
  '_Please review the diff and merge to publish._',
].join('\n'));
setOutput('pr_body_file', prBodyPath);

const commentPath = writeFile('final-comment.md', [
  '### Validation passed ✅',
  '',
  'Rule-based checks and AI review both passed. A pull request has been opened for maintainer review.',
].join('\n'));
setOutput('comment_file', commentPath);
