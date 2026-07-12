import { faker } from "@faker-js/faker";

export function generateDocTableProps(
  overrides: Partial<{ headers: string[]; rows: string[][] }> = {},
) {
  const columns = faker.number.int({ min: 2, max: 4 });
  const headers = Array.from({ length: columns }, () => faker.lorem.word());
  const rows = Array.from(
    { length: faker.number.int({ min: 1, max: 5 }) },
    () => Array.from({ length: columns }, () => faker.lorem.words(2)),
  );
  return { headers, rows, ...overrides };
}
