import Link from "next/link";
import type { ReactNode } from "react";
import { safeExternalUrl } from "./strings";

/**
 * Renderizador de um subconjunto seguro de Markdown para o conteúdo editorial
 * (guia turístico, descrições). Nunca injeta HTML: tudo é convertido em
 * elementos React, o que elimina o risco de XSS.
 *
 * Suportado: títulos (#, ##, ###), parágrafos, listas (-, *, 1.), citações (>),
 * **negrito**, *itálico*, `código`, [ligações](https://...), linhas em branco.
 */

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: "list", ...list });
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: "quote", text: quote.join(" ") });
      quote = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }
    const unordered = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const isOrdered = Boolean(ordered);
      const item = (unordered ?? ordered)![1];
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(item);
      continue;
    }
    const quoteMatch = /^>\s?(.*)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  flushQuote();
  return blocks;
}

const INLINE_RE =
  /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        const label = m[1];
        const href = m[2];
        if (href.startsWith("/")) {
          nodes.push(
            <Link key={key} href={href} className="text-turquoise underline underline-offset-2">
              {label}
            </Link>,
          );
        } else {
          const safe = safeExternalUrl(href);
          nodes.push(
            safe ? (
              <a
                key={key}
                href={safe}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-turquoise underline underline-offset-2"
              >
                {label}
              </a>
            ) : (
              label
            ),
          );
        }
      }
    }
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source || "");
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const key = `b-${i}`;
        switch (block.type) {
          case "heading": {
            const content = renderInline(block.text, key);
            if (block.level === 1)
              return (
                <h2 key={key} className="mt-8 mb-3 font-heading text-2xl font-semibold text-ocean first:mt-0">
                  {content}
                </h2>
              );
            if (block.level === 2)
              return (
                <h3 key={key} className="mt-6 mb-2 font-heading text-xl font-semibold text-ocean first:mt-0">
                  {content}
                </h3>
              );
            return (
              <h4 key={key} className="mt-5 mb-2 font-heading text-lg font-semibold text-ocean first:mt-0">
                {content}
              </h4>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="mb-4 leading-relaxed text-foreground/90">
                {renderInline(block.text, key)}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={key} className="mb-4 list-decimal space-y-1 pl-6">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="mb-4 list-disc space-y-1 pl-6">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="mb-4 border-l-4 border-sand bg-sand/10 px-4 py-2 text-foreground/80 italic"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
        }
      })}
    </div>
  );
}

/** Remove a sintaxe Markdown para gerar resumos/metadados. */
export function stripMarkdown(source: string): string {
  return (source || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
