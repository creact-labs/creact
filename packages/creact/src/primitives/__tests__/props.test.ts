import { faker} from "@faker-js/faker";
import { describe, expect, it} from "vitest";
import { createSignal} from "../../reactive/signal";
import { mergeProps, splitProps} from "../props";

describe("mergeProps", () => {
  it("applies defaults that later sources override", () => {
    const region = faker.location.countryCode().toLowerCase();

    const merged = mergeProps(
      { region: "us-east-1", replicas: 1 },
      { region },
    );

    expect(merged.region).toBe(region);
    expect(merged.replicas).toBe(1);
  });

  it("skips null and undefined sources", () => {
    const merged = mergeProps(
      null as any,
      { a: 1 },
      undefined as any,
      { b: 2 },
    );

    expect(merged).toEqual({ a: 1, b: 2 });
  });

  it("keeps getter props reactive after merging", () => {
    const [name, setName] = createSignal("first");
    const source = {
      get name() {
        return name();
      },
    };

    const merged = mergeProps({ fallback: true }, source) as {
      name: string;
      fallback: boolean;
    };
    setName("second");

    expect(merged.name).toBe("second");
  });

  it("returns an empty object when called with no sources", () => {
    expect(mergeProps()).toEqual({});
  });
});

describe("splitProps", () => {
  it("routes each requested key group and collects the rest", () => {
    const props = {
      dbName: faker.word.noun(),
      dbSize: faker.number.int({ min: 1, max: 100 }),
      cacheTtl: faker.number.int({ min: 1, max: 60 }),
      extra: faker.word.adjective(),
    };

    const [dbProps, cacheProps, rest] = splitProps(
      props,
      ["dbName", "dbSize"],
      ["cacheTtl"],
    );

    expect(dbProps).toEqual({ dbName: props.dbName, dbSize: props.dbSize });
    expect(cacheProps).toEqual({ cacheTtl: props.cacheTtl });
    expect(rest).toEqual({ extra: props.extra });
  });

  it("ignores requested keys that are not present", () => {
    const [picked, rest] = splitProps({ a: 1 }, ["a", "missing" as any]);

    expect(picked).toEqual({ a: 1 });
    expect(rest).toEqual({});
  });

  it("keeps getter props reactive in both the group and the rest", () => {
    const [value, setValue] = createSignal(1);
    const props = {
      get tracked() {
        return value();
      },
      get leftover() {
        return value() * 10;
      },
    };

    const [group, rest] = splitProps(props, ["tracked"]) as [
      { tracked: number },
      { leftover: number },
    ];
    setValue(2);

    expect(group.tracked).toBe(2);
    expect(rest.leftover).toBe(20);
  });
});
