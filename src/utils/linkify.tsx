import React from 'react';

// Matches http(s):// URLs and bare www. URLs
const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
// Trailing punctuation that is usually part of the sentence, not the URL
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

/**
 * Splits plain text into React nodes, turning URLs into links that open in a new tab.
 */
export function linkifyText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    let url = match[0];
    let trailing = '';
    const punct = url.match(TRAILING_PUNCT);
    if (punct) {
      // Keep a closing paren if the URL contains a matching opening one, e.g. Wikipedia links
      let cut = punct[0];
      if (cut.startsWith(')') && url.includes('(')) cut = cut.slice(1);
      if (cut) {
        trailing = cut;
        url = url.slice(0, -cut.length);
      }
    }

    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
    nodes.push(
      <a
        key={`link-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="text-[#5B21B6] underline underline-offset-2 break-all hover:text-[#4C1D95]"
      >
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
