import { describe, expect, it } from "vitest";
import ApiReference from "@/shared/components/api-reference";
import { renderWithProviders } from "@/testing/testing";
import { generateApiReferenceProps } from "../__mocks__/generate-api-reference-props";

describe("ApiReference", () => {
  it("reader sees the reference heading, signature, parameters and returns", () => {
    const props = generateApiReferenceProps();
    const { container } = renderWithProviders(() => (
      <ApiReference {...props} />
    ));

    expect(container.querySelector("#reference")?.textContent).toContain(
      "docs.reference",
    );
    expect(
      container.querySelector(".doc-code-filename")?.textContent,
    ).toBe(props.name);
    expect(container.querySelector("#parameters")?.textContent).toContain(
      "docs.parameters",
    );
    const headerCells = [...container.querySelectorAll("thead th")];
    expect(headerCells.map((cell) => cell.textContent)).toEqual([
      "docs.param_table.parameter",
      "docs.param_table.type",
      "docs.param_table.description",
    ]);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(
      props.parameters.length,
    );
    expect(container.querySelector("#returns")?.textContent).toContain(
      "docs.returns",
    );
    expect(container.textContent).toContain(props.returns);
  });

  it.each([
    { label: "omitted parameters", parameters: undefined },
    { label: "an empty parameter list", parameters: [] as string[][] },
  ])("$label shows no parameters section", ({ parameters }) => {
    const props = generateApiReferenceProps();
    const { container } = renderWithProviders(() => (
      <ApiReference
        name={props.name}
        signature={props.signature}
        parameters={parameters}
        returns={props.returns}
      />
    ));

    expect(container.querySelector("#parameters")).toBeNull();
    expect(container.querySelector("table")).toBeNull();
  });
});
