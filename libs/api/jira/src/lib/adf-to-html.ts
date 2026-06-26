interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface AdfNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
  content?: AdfNode[];
}

/** Converts Atlassian Document Format (Jira Cloud description field) to an HTML string. */
export function adfToHtml(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  return renderNode(node as AdfNode);
}

function renderNode(node: AdfNode): string {
  switch (node.type) {
    case 'doc':
      return renderChildren(node);

    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`;

    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.['level']) || 3, 1), 6);
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }

    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`;

    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`;

    case 'listItem':
      return `<li>${renderChildren(node)}</li>`;

    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`;

    case 'codeBlock': {
      const lang = node.attrs?.['language'] ? ` class="language-${node.attrs['language']}"` : '';
      return `<pre><code${lang}>${renderChildren(node)}</code></pre>`;
    }

    case 'rule':
      return '<hr />';

    case 'hardBreak':
      return '<br />';

    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks ?? []);

    case 'inlineCard':
    case 'blockCard': {
      const url = String(node.attrs?.['url'] ?? '');
      return url ? `<a href="${escapeAttr(url)}">${escapeHtml(url)}</a>` : '';
    }

    case 'mention': {
      const displayName = String(node.attrs?.['text'] ?? node.attrs?.['id'] ?? '@mention');
      return `<span class="qrm-mention">${escapeHtml(displayName)}</span>`;
    }

    case 'emoji': {
      const short = String(node.attrs?.['shortName'] ?? '');
      return escapeHtml(short);
    }

    case 'mediaSingle':
    case 'media':
      // Skip media nodes (images/attachments) — no URL available in ADF
      return '';

    default:
      // Unknown node — render children if any
      return renderChildren(node);
  }
}

function renderChildren(node: AdfNode): string {
  return (node.content ?? []).map(renderNode).join('');
}

function applyMarks(text: string, marks: AdfMark[]): string {
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `<strong>${result}</strong>`;
        break;
      case 'em':
        result = `<em>${result}</em>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link': {
        const href = escapeAttr(String(mark.attrs?.['href'] ?? ''));
        result = `<a href="${href}" target="_blank" rel="noopener noreferrer">${result}</a>`;
        break;
      }
    }
  }
  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
