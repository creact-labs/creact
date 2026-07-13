/** Cloud boundary: children deploy into the given region */
export function AWS(props: { region: string; children?: unknown }) {
  return <>{props.children}</>;
}
