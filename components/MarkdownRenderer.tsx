
import React from 'react';

interface MarkdownRendererProps {
  markdownText: string;
}

const parseInlineMarkdown = (text: string): React.ReactNode => {
  // Must handle bold and italic together to avoid conflicts, then code
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  // Regex for **bold**, *italic*, and `code`
  // Note: this basic regex doesn't handle nested or complex cases perfectly.
  const regex = /(\*\*(.*?)\*\*|__(.*?)__)|(\*(.*?)\*|_([^_]+)_)|(`(.*?)`)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const startIndex = match.index;
    const [fullMatch, boldDoubleStar, boldContentDoubleStar, boldUnderscore, boldContentUnderscore, italicStar, italicContentStar, italicUnderscore, italicContentUnderscore, inlineCode, codeContent] = match;

    // Add preceding text
    if (startIndex > lastIndex) {
      elements.push(text.substring(lastIndex, startIndex));
    }

    if (boldDoubleStar || boldUnderscore) {
      elements.push(<strong key={startIndex}>{boldContentDoubleStar || boldContentUnderscore}</strong>);
    } else if (italicStar || italicUnderscore) {
      elements.push(<em key={startIndex}>{italicContentStar || italicContentUnderscore}</em>);
    } else if (inlineCode) {
      elements.push(
        <code key={startIndex} className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-sm font-mono">
          {codeContent}
        </code>
      );
    }
    lastIndex = startIndex + fullMatch.length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }
  
  // Filter out empty strings that might have been pushed if regex matched at start/end
  return elements.filter(el => typeof el !== 'string' || el.length > 0);
};


export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdownText }) => {
  const lines = markdownText.split('\n');
  const elements: React.ReactNode[] = [];
  let inListType: 'ul' | 'ol' | null = null;
  let listItems: React.ReactNode[] = [];

  const closeList = () => {
    if (inListType && listItems.length > 0) {
      if (inListType === 'ul') {
        elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside my-2 ml-4 space-y-1 text-sm">{listItems}</ul>);
      } else if (inListType === 'ol') {
        elements.push(<ol key={`ol-${elements.length}`} className="list-decimal list-inside my-2 ml-4 space-y-1 text-sm">{listItems}</ol>);
      }
    }
    listItems = [];
    inListType = null;
  };

  lines.forEach((line, index) => {
    // Headers
    const h3Match = line.match(/^###\s+(.*)/);
    if (h3Match) {
      closeList();
      elements.push(<h3 key={index} className="text-md font-semibold my-1 text-gray-700 dark:text-gray-200">{parseInlineMarkdown(h3Match[1])}</h3>);
      return;
    }
    const h2Match = line.match(/^##\s+(.*)/);
    if (h2Match) {
      closeList();
      elements.push(<h2 key={index} className="text-lg font-semibold my-2 text-gray-700 dark:text-gray-200">{parseInlineMarkdown(h2Match[1])}</h2>);
      return;
    }
    const h1Match = line.match(/^#\s+(.*)/);
    if (h1Match) {
      closeList();
      elements.push(<h1 key={index} className="text-xl font-semibold my-3 text-gray-700 dark:text-gray-200">{parseInlineMarkdown(h1Match[1])}</h1>);
      return;
    }

    // Unordered List
    const ulMatch = line.match(/^[\*\-]\s+(.*)/);
    if (ulMatch) {
      if (inListType !== 'ul') {
        closeList();
        inListType = 'ul';
      }
      listItems.push(<li key={`${inListType}-li-${index}`}>{parseInlineMarkdown(ulMatch[1])}</li>);
      return;
    }

    // Ordered List
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (inListType !== 'ol') {
        closeList();
        inListType = 'ol';
      }
      listItems.push(<li key={`${inListType}-li-${index}`}>{parseInlineMarkdown(olMatch[1])}</li>);
      return;
    }
    
    // If not a list item, close any open list
    closeList();

    // Code Blocks (simple version, assumes ``` on its own line)
    // More robust parsing would be needed for nested or mixed content.
    // This current component will handle paragraphs and inline styling within them.

    // Default to paragraph for non-empty lines
    if (line.trim() !== '') {
      elements.push(<p key={index} className="my-1 text-sm">{parseInlineMarkdown(line)}</p>);
    } else {
       // Preserve empty lines as a break, but avoid multiple <br> if not needed
       if (elements.length > 0 && elements[elements.length -1] !== '\n') { // Avoid duplicate newlines
         elements.push('\n'); // Represents a line break, will be handled by CSS whitespace-pre-wrap on parent
       }
    }
  });

  closeList(); // Ensure any trailing list is closed

  // Render React.Fragment with children to avoid unnecessary div, then join string '\n' to <br /> or rely on CSS.
  // Here, just returning array of nodes. Parent MessageBubble can wrap in a div.
  return <>{elements.map((el, i) => el === '\n' && i < elements.length - 1 ? <br key={`br-${i}`}/> : el)}</>;
};
