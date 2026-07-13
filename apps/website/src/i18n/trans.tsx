import type { Component, JSX } from "solid-js";
import { createMemo } from "solid-js";
import { type TranslationKey, t } from "./translations";

/**
 * Trans renders a translation whose value carries component placeholders,
 * react-i18next style: `"Omit for <code>T | undefined</code>."`. The
 * placeholders are a fixed inline vocabulary — code, strong, em, and
 * a href — interpolated as real elements, never through innerHTML. Text
 * outside placeholders is a plain text node, so TypeScript syntax like
 * Accessor<any> inside a code chunk renders literally.
 */

const PLACEHOLDER =
  /<(code|strong|em)>(.*?)<\/\1>|<a href="([^"]*)">(.*?)<\/a>/g;

/** Decode the few entities the resource values use */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// One renderer per vocabulary tag; anchors also receive their href
const TAGS: Record<
  string,
  (text: string, href: string | undefined) => JSX.Element
> = {
  code: (text) => <code>{text}</code>,
  strong: (text) => <strong>{text}</strong>,
  em: (text) => <em>{text}</em>,
  a: (text, href) => <a href={href}>{text}</a>,
};

function renderMatch(match: RegExpExecArray): JSX.Element {
  if (match[1]) return TAGS[match[1]]!(decodeEntities(match[2]!), undefined);
  return TAGS.a!(decodeEntities(match[4]!), match[3]);
}

function pushText(
  parts: JSX.Element[],
  value: string,
  from: number,
  to: number,
): void {
  if (to > from) parts.push(decodeEntities(value.slice(from, to)));
}

/** Split a value into text nodes and interpolated vocabulary elements */
export function parseTransValue(value: string): JSX.Element[] {
  const parts: JSX.Element[] = [];
  let cursor = 0;
  for (const match of value.matchAll(PLACEHOLDER)) {
    pushText(parts, value, cursor, match.index);
    parts.push(renderMatch(match));
    cursor = match.index + match[0].length;
  }
  pushText(parts, value, cursor, value.length);
  return parts;
}

export const Trans: Component<{ k: TranslationKey }> = (props) => {
  const parts = createMemo(() => parseTransValue(t(props.k)));
  return <>{parts()}</>;
};
