import { faker } from "@faker-js/faker";

export function generateDocSteps(count?: number) {
  return Array.from(
    { length: count ?? faker.number.int({ min: 2, max: 6 }) },
    () => ({
      label: faker.lorem.words(2),
      body: faker.lorem.sentence(),
    }),
  );
}
