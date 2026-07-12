import { faker } from "@faker-js/faker";

export function generateApiReferenceProps(
  overrides: Partial<{
    name: string;
    signature: string;
    parameters: string[][];
    returns: string;
  }> = {},
) {
  const name = faker.hacker.verb().replace(/\s/g, "");
  return {
    name,
    signature: `function ${name}(): void`,
    parameters: Array.from(
      { length: faker.number.int({ min: 1, max: 3 }) },
      () => [faker.lorem.word(), faker.lorem.word(), faker.lorem.sentence()],
    ),
    returns: faker.lorem.sentence(),
    ...overrides,
  };
}
