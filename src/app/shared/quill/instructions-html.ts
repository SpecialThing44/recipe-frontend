interface InstructionAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  link?: string;
  header?: number;
  list?: string;
  indent?: number;
  blockquote?: boolean;
  'code-block'?: boolean | string;
}

interface InstructionOperation {
  insert: string | { image?: string };
  attributes?: InstructionAttributes;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeUrl(value: string): string {
  return /^(https?:|\/(?!\/)|\.{1,2}\/|#)/i.test(value) ? escapeHtml(value) : '';
}

function inlineHtml(text: string, attributes: InstructionAttributes): string {
  let html = escapeHtml(text);
  if (attributes.bold) html = `<strong>${html}</strong>`;
  if (attributes.italic) html = `<em>${html}</em>`;
  if (attributes.underline) html = `<u>${html}</u>`;
  if (attributes.strike) html = `<s>${html}</s>`;
  if (attributes.link && safeUrl(attributes.link)) {
    html = `<a href="${safeUrl(attributes.link)}" rel="noopener noreferrer">${html}</a>`;
  }
  return html;
}

export function instructionsToHtml(instructions: unknown): string {
  let delta = instructions;
  if (typeof delta === 'string') {
    try {
      delta = JSON.parse(delta);
    } catch {
      return `<p>${escapeHtml(delta as string)}</p>`;
    }
  }
  if (!delta || typeof delta !== 'object' || !('ops' in delta) || !Array.isArray(delta.ops)) {
    return `<p>${escapeHtml(String(instructions ?? ''))}</p>`;
  }

  const blocks: string[] = [];
  const lists: string[] = [];
  let line = '';
  let codeLines: string[] = [];
  const closeLists = (depth = 0) => {
    while (lists.length > depth) blocks.push(`</li></${lists.pop()}>`);
  };
  const closeCode = () => {
    if (codeLines.length === 0) return;
    blocks.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
    codeLines = [];
  };
  const flushLine = (attributes: InstructionAttributes = {}) => {
    const content = line || '<br>';
    line = '';
    if (attributes['code-block']) {
      closeLists();
      codeLines.push(content);
      return;
    }
    closeCode();
    if (attributes.list) {
      const tag = attributes.list === 'ordered' ? 'ol' : 'ul';
      const depth = Math.max(0, Math.min(8, attributes.indent || 0));
      closeLists(depth + 1);
      if (lists.length === depth + 1 && lists[depth] !== tag) closeLists(depth);
      if (lists.length === depth + 1) blocks.push('</li><li>');
      while (lists.length < depth + 1) {
        blocks.push(`<${tag}><li>`);
        lists.push(tag);
      }
      blocks.push(content);
      return;
    }
    closeLists();
    const heading = attributes.header;
    const tag = heading && heading >= 1 && heading <= 6 ? `h${heading}`
      : attributes.blockquote ? 'blockquote' : 'p';
    const indent = attributes.indent ? ` class="ql-indent-${Math.min(8, attributes.indent)}"` : '';
    blocks.push(`<${tag}${indent}>${content}</${tag}>`);
  };

  for (const operation of delta.ops as InstructionOperation[]) {
    const attributes = operation.attributes || {};
    if (typeof operation.insert === 'string') {
      const parts = operation.insert.split('\n');
      parts.forEach((part, index) => {
        line += inlineHtml(part, attributes);
        if (index < parts.length - 1) flushLine(attributes);
      });
    } else if (operation.insert.image) {
      const url = safeUrl(operation.insert.image);
      if (url) line += `<img src="${url}" alt="Instruction image" loading="lazy">`;
    }
  }
  if (line) flushLine();
  closeLists();
  closeCode();
  return blocks.join('');
}
