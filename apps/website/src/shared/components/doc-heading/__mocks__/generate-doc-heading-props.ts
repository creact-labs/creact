import { faker } from "@faker-js/faker";

export function generateDocHeadingProps(
  overrides: Partial<{ level: 2 | 3; id: string; text: string }> = {},
) {
  return {
    level: faker.helpers.arrayElement([2, 3] as const),
    id: faker.lorem.slug(2),
    text: faker.lorem.words(3),
    ...overrides,
  };
}
