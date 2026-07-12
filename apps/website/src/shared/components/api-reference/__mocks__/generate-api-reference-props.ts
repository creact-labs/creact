import { faker } from "@faker-js/faker";

export function generateApiReferenceProps(
  overrides: Partial<{
    name: string;
    signature: string;
    parameters: string[][];
    returns: string;
  }> = {},
) {
  // Overrides apply first so the derived signature always reflects the
  // effective name and parameters (unless explicitly overridden)
  const name = overrides.name ?? faker.hacker.verb().replace(/\s/g, "");
  const parameters =
    overrides.parameters ??
    Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => [
      faker.lorem.word(),
      faker.lorem.word(),
      faker.lorem.sentence(),
    ]);
  const parameterNames = parameters.map(([parameter]) => parameter).join(", ");

  return {
    name,
    signature: overrides.signature ?? `function ${name}(${parameterNames}): void`,
    parameters,
    returns: overrides.returns ?? faker.lorem.sentence(),
  };
}
