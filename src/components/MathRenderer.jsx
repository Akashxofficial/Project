import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export default function MathRenderer({ text }) {
  if (typeof text !== 'string') {
    return <span>{text}</span>;
  }

  // 1. Split on block math first: $$...$$
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: 'text', content: textBefore });
    }
    parts.push({ type: 'block', content: match[1] });
    lastIndex = blockRegex.lastIndex;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    parts.push({ type: 'text', content: remainingText });
  }

  // 2. Split text parts by inline math: $...$
  const inlineRegex = /\$([^$]+?)\$/g;
  const finalParts = [];

  for (const part of parts) {
    if (part.type === 'block') {
      finalParts.push(part);
    } else {
      let inlineLastIndex = 0;
      let inlineMatch;
      const partContent = part.content;

      while ((inlineMatch = inlineRegex.exec(partContent)) !== null) {
        const textBefore = partContent.slice(inlineLastIndex, inlineMatch.index);
        if (textBefore) {
          finalParts.push({ type: 'text', content: textBefore });
        }
        finalParts.push({ type: 'inline', content: inlineMatch[1] });
        inlineLastIndex = inlineRegex.lastIndex;
      }

      const inlineRemaining = partContent.slice(inlineLastIndex);
      if (inlineRemaining) {
        finalParts.push({ type: 'text', content: inlineRemaining });
      }
    }
  }

  // 3. Render parts
  return (
    <>
      {finalParts.map((part, index) => {
        if (part.type === 'block') {
          try {
            return (
              <BlockMath
                key={index}
                math={part.content}
                renderError={(error) => <span style={{ color: 'red' }}>$${part.content}$$</span>}
              />
            );
          } catch (err) {
            return <span key={index} style={{ color: 'red' }}>$${part.content}$$</span>;
          }
        } else if (part.type === 'inline') {
          try {
            return (
              <InlineMath
                key={index}
                math={part.content}
                renderError={(error) => <span style={{ color: 'red' }}>${part.content}$</span>}
              />
            );
          } catch (err) {
            return <span key={index} style={{ color: 'red' }}>${part.content}$</span>;
          }
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </>
  );
}
