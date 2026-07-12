import type { Component, JSXElement } from "solid-js";
import { For } from "solid-js";

interface DocTableProps {
  /** Column header labels, in order */
  headers: string[];
  /** One array of cells per row; cells may be strings or inline JSX */
  rows: JSXElement[][];
}

/**
 * Data table for documentation pages (parameters, options, module lists…).
 * Owns the table markup so pages only declare their content.
 */
const DocTable: Component<DocTableProps> = (props) => {
  return (
    <table>
      <thead>
        <tr>
          <For each={props.headers}>{(header) => <th>{header}</th>}</For>
        </tr>
      </thead>
      <tbody>
        <For each={props.rows}>
          {(row) => (
            <tr>
              <For each={row}>{(cell) => <td>{cell}</td>}</For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
};

export default DocTable;
