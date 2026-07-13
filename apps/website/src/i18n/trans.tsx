import type { Component, JSX } from "solid-js";
import { createMemo } from "solid-js";
import { type TranslationKey, t } from "./translations";

/**
 * Trans interpolates caller-supplied components into a translation value,
 * react-i18next style. Values carry only numbered placeholders — never
 * markup: `"Omit for <0>T | undefined</0>."`. The call site passes regular
 * components, one per placeholder index:
 *
 *   <Trans
 *     k="docs.api.reactive.create_signal.param_value_desc"
 *     components={[Code]}
 *   />
 *
 * All composition lives in components; translations are plain copy.
 */

const PLACEHOLDER = /<(\d+)>(.*?)<\/\1>/g;

export type TransComponents = ReadonlyArray<Component<{ children: string }>>;

/** Split a value into text nodes and interpolated placeholder renders */
export function parseTransValue(
  value: string,
  components: TransComponents,
): JSX.Element[] {
  const parts: JSX.Element[] = [];
  let cursor = 0;
  for (const match of value.matchAll(PLACEHOLDER)) {
    pushText(parts, value, cursor, match.index);
    parts.push(renderPlaceholder(match, components));
    cursor = match.index + match[0].length;
  }
  pushText(parts, value, cursor, value.length);
  return parts;
}

function renderPlaceholder(
  match: RegExpExecArray,
  components: TransComponents,
): JSX.Element {
  const Part = components[Number(match[1])];
  // A placeholder without a supplied component degrades to its own text
  return Part ? <Part>{match[2]!}</Part> : match[2]!;
}

function pushText(
  parts: JSX.Element[],
  value: string,
  from: number,
  to: number,
): void {
  if (to > from) parts.push(value.slice(from, to));
}

export const Trans: Component<{
  k: TranslationKey;
  components?: TransComponents;
}> = (props) => {
  const parts = createMemo(() =>
    parseTransValue(t(props.k), props.components ?? []),
  );
  return <>{parts()}</>;
};
