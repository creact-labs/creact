import { faker } from "@faker-js/faker";

export function generateUsageSectionProps(
  overrides: Partial<{ code: string; filename: string }> = {},
) {
  return {
    code: `const ${faker.lorem.word()} = ${faker.number.int(100)};`,
    filename: faker.system.commonFileName("tsx"),
    ...overrides,
  };
}
