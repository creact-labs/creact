import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import DocTable from "@/shared/components/doc-table";
import { generateDocTableProps } from "../__mocks__/generate-doc-table-props";

describe("DocTable", () => {
  it("reader sees every column header in order", () => {
    const props = generateDocTableProps();
    const { container } = render(() => <DocTable {...props} />);

    const headerCells = [...container.querySelectorAll("thead th")];
    expect(headerCells.map((cell) => cell.textContent)).toEqual(props.headers);
  });

  it("reader sees one table row per data row with its cells", () => {
    const props = generateDocTableProps();
    const { container } = render(() => <DocTable {...props} />);

    const bodyRows = [...container.querySelectorAll("tbody tr")];
    expect(bodyRows).toHaveLength(props.rows.length);
    for (const [index, row] of props.rows.entries()) {
      const cells = [...bodyRows[index]!.querySelectorAll("td")];
      expect(cells.map((cell) => cell.textContent)).toEqual(row);
    }
  });
});
