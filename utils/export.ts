import type { ExtensionSettings, EvaluationStatus } from './types';

const STATUS_ICON: Record<EvaluationStatus, string> = {
  met: '✅',
  not_met: '❌',
  unknown: '❔',
};

const VERDICT_LABEL = {
  worth_it: 'Worth it',
  maybe: 'Maybe',
  skip: 'Skip',
} as const;

export function buildSessionExport(s: ExtensionSettings): string {
  const lines: string[] = [];
  lines.push('# YC Co-Founder Analyzer — Session Export');
  lines.push('');
  lines.push(`Exported ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## My project context');
  lines.push('');
  lines.push(s.contextText.trim() || '_(none)_');
  lines.push('');

  lines.push('## Dimensions (priority order)');
  lines.push('');
  const sorted = s.dimensions.slice().sort((a, b) => a.priority - b.priority);
  if (sorted.length === 0) lines.push('_(none)_');
  sorted.forEach((d, i) => {
    lines.push(`${i + 1}. **${d.label}** — ${d.why}`);
  });
  lines.push('');

  lines.push('## Hard requirements');
  lines.push('');
  if (s.requirements.length === 0) lines.push('_(none)_');
  s.requirements.forEach((r) => lines.push(`- ${r.text}`));
  lines.push('');

  lines.push(`## Profile evaluations (${s.evaluations.length})`);
  lines.push('');
  if (s.evaluations.length === 0) {
    lines.push('_(no profiles analyzed yet)_');
    lines.push('');
  }
  for (const c of s.evaluations) {
    lines.push(`### ${c.name}`);
    lines.push('');
    lines.push(
      `**Verdict:** ${VERDICT_LABEL[c.evaluation.verdict]} · **Score:** ${c.evaluation.score}/100`,
    );
    if (c.evaluation.summary) {
      lines.push('');
      lines.push(`> ${c.evaluation.summary}`);
    }
    lines.push('');

    const dims = c.evaluation.rows.filter((r) => r.kind === 'dimension');
    if (dims.length) {
      lines.push('**Dimensions**');
      lines.push('');
      for (const r of dims) {
        lines.push(`- ${STATUS_ICON[r.status]} ${r.label}: ${r.reason}`);
      }
      lines.push('');
    }
    const reqs = c.evaluation.rows.filter((r) => r.kind === 'requirement');
    if (reqs.length) {
      lines.push('**Requirements**');
      lines.push('');
      for (const r of reqs) {
        lines.push(`- ${STATUS_ICON[r.status]} ${r.label}: ${r.reason}`);
      }
      lines.push('');
    }

    lines.push('<details><summary>Raw profile text</summary>');
    lines.push('');
    lines.push('```');
    lines.push(c.profileText);
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
