// Simple markdown renderer for chat messages
// Converts markdown syntax to React elements

export const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentParagraph = [];
  let listItems = [];
  let inList = false;

  const processInlineMarkdown = (line) => {
    const parts = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index === 0) {
        parts.push(<strong key={`bold-${key++}`}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text*
      const italicMatch = remaining.match(/\*(.+?)\*/);
      if (italicMatch && italicMatch.index === 0) {
        parts.push(<em key={`italic-${key++}`}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Links: [text](url)
      const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);
      if (linkMatch && linkMatch.index === 0) {
        parts.push(
          <a
            key={`link-${key++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 underline"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Code: `text`
      const codeMatch = remaining.match(/`(.+?)`/);
      if (codeMatch && codeMatch.index === 0) {
        parts.push(
          <code
            key={`code-${key++}`}
            className="bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // No match, add next character as text
      const nextSpecial = remaining.search(/[\*\[`]/);
      const textChunk = nextSpecial === -1 ? remaining : remaining.slice(0, nextSpecial);
      if (textChunk) {
        parts.push(textChunk);
      }
      remaining = remaining.slice(textChunk.length);
    }

    return parts.length > 0 ? parts : line;
  };

  lines.forEach((line, index) => {
    // Empty line - flush current paragraph
    if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={`p-${elements.length}`} className="mb-2">
            {currentParagraph}
          </p>
        );
        currentParagraph = [];
      }
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="mb-2 ml-4 list-disc space-y-1">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
      return;
    }

    // List item: - text or * text
    if (line.trim().match(/^[-*]\s/)) {
      const content = line.trim().slice(2);
      listItems.push(
        <li key={`li-${listItems.length}`}>{processInlineMarkdown(content)}</li>
      );
      inList = true;
      return;
    }

    // Numbered list: 1. text
    if (line.trim().match(/^\d+\.\s/)) {
      const content = line.trim().replace(/^\d+\.\s/, '');
      if (!inList) {
        inList = 'numbered';
      }
      listItems.push(
        <li key={`li-${listItems.length}`}>{processInlineMarkdown(content)}</li>
      );
      return;
    }

    // Regular text line
    if (inList && listItems.length > 0) {
      const ListTag = inList === 'numbered' ? 'ol' : 'ul';
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`mb-2 ml-4 ${inList === 'numbered' ? 'list-decimal' : 'list-disc'} space-y-1`}
        >
          {listItems}
        </ListTag>
      );
      listItems = [];
      inList = false;
    }

    currentParagraph.push(processInlineMarkdown(line));
    if (index < lines.length - 1) {
      currentParagraph.push(' ');
    }
  });

  // Flush remaining content
  if (currentParagraph.length > 0) {
    elements.push(
      <p key={`p-${elements.length}`} className="mb-2 last:mb-0">
        {currentParagraph}
      </p>
    );
  }
  if (inList && listItems.length > 0) {
    const ListTag = inList === 'numbered' ? 'ol' : 'ul';
    elements.push(
      <ListTag
        key={`list-${elements.length}`}
        className={`mb-2 ml-4 ${inList === 'numbered' ? 'list-decimal' : 'list-disc'} space-y-1`}
      >
        {listItems}
      </ListTag>
    );
  }

  return <div className="markdown-content">{elements}</div>;
};
