import { afterEach, describe, expect, it, vi } from "vitest";
import { createEffect, createSignal, For, Show } from "../../src/index";
import { useAsyncOutput } from "../src/instance";
import type { Memory } from "../src/memory";
import { render, resetRuntime } from "../src/run";
import { InMemoryMemory } from "../../test/helpers/setup";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

/** Helper: delay for async handlers */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  resetRuntime();
});

describe("eager handler cascading", () => {
  it("handler A outputs → component B materializes → B's handler runs in same apply call", async () => {
    const handlerOrder: string[] = [];

    function Analysis(props: { key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Analysis");
          setOutputs({ summary: "analyzed-data" });
        },
      );
      // Use function children so summary is evaluated reactively when Show renders
      return Show({
        when: () => out.summary(),
        children: (summary: () => string) =>
          h(Connects, { summary: summary(), key: "c1" }, "c1"),
      });
    }

    function Connects(props: { summary: string; key: string }) {
      useAsyncOutput(
        { summary: props.summary, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Connects:${p.summary}`);
          setOutputs({ connected: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Analysis, { key: "a1" }, "a1"),
      memory,
      "test-eager-cascade",
    );

    await result.ready;

    // Both handlers should have run — Analysis first, then Connects
    expect(handlerOrder).toEqual(["Analysis", "Connects:analyzed-data"]);

    result.dispose();
  });

  it("two independent sibling handlers run concurrently", async () => {
    const timeline: { node: string; event: string; time: number }[] = [];
    const start = Date.now();

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        timeline.push({ node: "A", event: "start", time: Date.now() - start });
        await delay(50);
        timeline.push({ node: "A", event: "end", time: Date.now() - start });
        setOutputs({ done: true });
      });
      return <></>;
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        timeline.push({ node: "B", event: "start", time: Date.now() - start });
        await delay(50);
        timeline.push({ node: "B", event: "end", time: Date.now() - start });
        setOutputs({ done: true });
      });
      return <></>;
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Root, {}, "root"), memory, "test-parallel");

    await result.ready;

    // Both should have started before either finished (concurrent execution)
    const aStart = timeline.find((t) => t.node === "A" && t.event === "start");
    const bStart = timeline.find((t) => t.node === "B" && t.event === "start");
    const aEnd = timeline.find((t) => t.node === "A" && t.event === "end");
    const bEnd = timeline.find((t) => t.node === "B" && t.event === "end");

    expect(aStart).toBeDefined();
    expect(bStart).toBeDefined();
    expect(aEnd).toBeDefined();
    expect(bEnd).toBeDefined();

    // B should start before A ends (parallel)
    expect(bStart!.time).toBeLessThan(aEnd!.time);

    result.dispose();
  });

  it("diamond dependency: A→B, A→C, B+C→D — correct ordering", async () => {
    const handlerOrder: string[] = [];

    // A is the root
    function A(props: { key: string }) {
      const out = useAsyncOutput<{ aVal: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("A");
          setOutputs({ aVal: "from-A" });
        },
      );
      return Show({
        when: () => out.aVal(),
        children: (aVal: () => string) => [
          h(B, { aVal: aVal(), key: "b" }, "b"),
          h(C, { aVal: aVal(), key: "c" }, "c"),
        ],
      });
    }

    // B depends on A
    function B(props: { aVal: string; key: string }) {
      const out = useAsyncOutput<{ bVal: string }>(
        { aVal: props.aVal, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push("B");
          setOutputs({ bVal: `B(${p.aVal})` });
        },
      );
      return Show({
        when: () => out.bVal(),
        children: (bVal: () => string) =>
          h(D, { bVal: bVal(), cVal: "pending", key: "d-from-b" }, "d-from-b"),
      });
    }

    // C depends on A
    function C(props: { aVal: string; key: string }) {
      useAsyncOutput(
        { aVal: props.aVal, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push("C");
          setOutputs({ cVal: `C(${p.aVal})` });
        },
      );
      return <></>;
    }

    // D depends on B (materializes when B outputs)
    function D(props: { bVal: string; cVal: string; key: string }) {
      useAsyncOutput(
        { bVal: props.bVal, cVal: props.cVal, key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("D");
          setOutputs({ done: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(A, { key: "a" }, "a"),
      memory,
      "test-diamond",
    );

    await result.ready;

    // A must run first, then B and C (in any order), then D
    expect(handlerOrder[0]).toBe("A");
    expect(handlerOrder.slice(1, 3).sort()).toEqual(["B", "C"]);
    expect(handlerOrder).toContain("D");

    result.dispose();
  });

  it("error propagation: handler throws → dependents don't run, deployment fails", async () => {
    const handlerOrder: string[] = [];

    function Failing(props: { key: string }) {
      const out = useAsyncOutput<{ val: string }>(
        { key: props.key },
        async () => {
          handlerOrder.push("Failing");
          throw new Error("handler-error");
        },
      );
      return Show({
        when: () => out.val(),
        children: h(Dependent, { key: "dep" }, "dep"),
      });
    }

    function Dependent(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerOrder.push("Dependent");
        setOutputs({ done: true });
      });
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Failing, { key: "f1" }, "f1"),
      memory,
      "test-error",
    );

    await expect(result.ready).rejects.toThrow("handler-error");

    // Only the failing handler should have run
    expect(handlerOrder).toEqual(["Failing"]);

    // Deployment should be marked as failed
    const state = await memory.getState("test-error");
    expect(state?.status).toBe("failed");

    result.dispose();
  });

  it("initial run with unchanged nodes re-executes handlers idempotently", async () => {
    let handlerCallCount = 0;

    function Idempotent(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerCallCount++;
        setOutputs({ count: handlerCallCount });
      });
      return <></>;
    }

    const memory = new InMemoryMemory();

    // First run
    const result1 = render(
      () => h(Idempotent, { key: "idem" }, "idem"),
      memory,
      "test-idempotent",
    );
    await result1.ready;
    expect(handlerCallCount).toBe(1);
    result1.dispose();
    resetRuntime();

    // Second run — handler should run again (idempotent re-execution)
    handlerCallCount = 0;
    const result2 = render(
      () => h(Idempotent, { key: "idem" }, "idem"),
      memory,
      "test-idempotent",
    );
    await result2.ready;
    expect(handlerCallCount).toBe(1);
    result2.dispose();
  });

  it("deep chain cascade resolves all levels", async () => {
    const handlerOrder: string[] = [];

    function Stage1(props: { key: string }) {
      const out = useAsyncOutput<{ s1: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("S1");
          setOutputs({ s1: "from-s1" });
        },
      );
      return Show({
        when: () => out.s1(),
        children: (s1: () => string) =>
          h(Stage2, { input: s1(), key: "s2" }, "s2"),
      });
    }

    function Stage2(props: { input: string; key: string }) {
      const out = useAsyncOutput<{ s2: string }>(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S2:${p.input}`);
          setOutputs({ s2: `s2(${p.input})` });
        },
      );
      return Show({
        when: () => out.s2(),
        children: (s2: () => string) =>
          h(Stage3, { input: s2(), key: "s3" }, "s3"),
      });
    }

    function Stage3(props: { input: string; key: string }) {
      const out = useAsyncOutput<{ s3: string }>(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S3:${p.input}`);
          setOutputs({ s3: `s3(${p.input})` });
        },
      );
      return Show({
        when: () => out.s3(),
        children: (s3: () => string) =>
          h(Stage4, { input: s3(), key: "s4" }, "s4"),
      });
    }

    function Stage4(props: { input: string; key: string }) {
      const out = useAsyncOutput<{ s4: string }>(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S4:${p.input}`);
          setOutputs({ s4: `s4(${p.input})` });
        },
      );
      return Show({
        when: () => out.s4(),
        children: (s4: () => string) =>
          h(Stage5, { input: s4(), key: "s5" }, "s5"),
      });
    }

    function Stage5(props: { input: string; key: string }) {
      useAsyncOutput(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S5:${p.input}`);
          setOutputs({ done: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Stage1, { key: "s1" }, "s1"),
      memory,
      "test-deep-chain",
    );

    await result.ready;

    expect(handlerOrder).toEqual([
      "S1",
      "S2:from-s1",
      "S3:s2(from-s1)",
      "S4:s3(s2(from-s1))",
      "S5:s4(s3(s2(from-s1)))",
    ]);

    result.dispose();
  });

  it("wide fan-out with secondary cascade", async () => {
    const handlerOrder: string[] = [];

    function Root(props: { key: string }) {
      const out = useAsyncOutput<{ ready: boolean }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Root");
          setOutputs({ ready: true });
        },
      );
      return Show({
        when: () => out.ready(),
        children: () => [
          h(BranchA, { key: "a" }, "a"),
          h(BranchB, { key: "b" }, "b"),
          h(BranchC, { key: "c" }, "c"),
        ],
      });
    }

    function BranchA(props: { key: string }) {
      const out = useAsyncOutput<{ aVal: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("A");
          setOutputs({ aVal: "done-a" });
        },
      );
      return Show({
        when: () => out.aVal(),
        children: (aVal: () => string) =>
          h(Leaf, { from: aVal(), key: "leaf-a" }, "leaf-a"),
      });
    }

    function BranchB(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("B");
          setOutputs({ bVal: "done-b" });
        },
      );
      return <></>;
    }

    function BranchC(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("C");
          setOutputs({ cVal: "done-c" });
        },
      );
      return <></>;
    }

    function Leaf(props: { from: string; key: string }) {
      useAsyncOutput(
        { from: props.from, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Leaf:${p.from}`);
          setOutputs({ processed: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, { key: "root" }, "root"),
      memory,
      "test-wide-cascade",
    );

    await result.ready;

    // Root runs first
    expect(handlerOrder[0]).toBe("Root");
    // Then A, B, C in some order
    expect(handlerOrder.filter((h) => ["A", "B", "C"].includes(h)).sort()).toEqual([
      "A",
      "B",
      "C",
    ]);
    // Leaf runs after A
    expect(handlerOrder).toContain("Leaf:done-a");
    const aIdx = handlerOrder.indexOf("A");
    const leafIdx = handlerOrder.indexOf("Leaf:done-a");
    expect(leafIdx).toBeGreaterThan(aIdx);

    result.dispose();
  });

  it("effect aggregates sibling outputs and gates a separate branch", async () => {
    const handlerOrder: string[] = [];

    // Shared state: parent creates signals, children write through effects
    const [allDone, setAllDone] = createSignal(false);
    const completedSet = new Set<string>();

    function Root() {
      return [
        // Branch 1: multiple workers
        h(Worker, { id: "w1", key: "w1" }, "w1"),
        h(Worker, { id: "w2", key: "w2" }, "w2"),
        h(Worker, { id: "w3", key: "w3" }, "w3"),
        // Branch 2: gated downstream (sibling of workers)
        Show({
          when: allDone,
          children: () => h(Downstream, { key: "ds" }, "ds"),
        }),
      ];
    }

    function Worker(props: { id: string; key: string }) {
      const out = useAsyncOutput<{ result: string }>(
        { key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Worker:${props.id}`);
          setOutputs({ result: `done-${props.id}` });
        },
      );

      // Effect watches this worker's output and updates shared gate
      createEffect(() => {
        const r = out.result();
        if (r) {
          completedSet.add(props.id);
          if (completedSet.size === 3) {
            setAllDone(true);
          }
        }
      });

      return <></>;
    }

    function Downstream(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Downstream");
          setOutputs({ final: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, {}, "root"),
      memory,
      "test-cross-branch",
    );

    await result.ready;
    await result.settled();

    // All workers should have run
    expect(
      handlerOrder.filter((h) => h.startsWith("Worker:")).length,
    ).toBe(3);
    // Downstream should have run after workers completed
    expect(handlerOrder).toContain("Downstream");

    result.dispose();
  });

  // ── Async handler tests (reproduce app patterns) ──────────────────

  it("async handler → setOutputs → For creates children → children handlers run", async () => {
    const handlerOrder: string[] = [];

    interface Item { id: string; name: string }

    function Parent(props: { key: string }) {
      const out = useAsyncOutput<{ items: Item[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Parent");
          await delay(10);
          setOutputs({ items: [
            { id: "a", name: "alpha" },
            { id: "b", name: "beta" },
            { id: "c", name: "gamma" },
          ]});
        },
      );

      return For({
        each: () => out.items() ?? [],
        keyFn: (item: Item) => item.id,
        children: (item) => h(Child, { item: item(), key: item().id }, item().id),
      });
    }

    function Child(props: { item: Item; key: string }) {
      useAsyncOutput(
        { item: props.item, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Child:${p.item.id}`);
          setOutputs({ processed: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "parent" }, "parent"),
      memory,
      "test-async-for",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("Parent");
    expect(handlerOrder.filter(h => h.startsWith("Child:")).sort()).toEqual([
      "Child:a", "Child:b", "Child:c",
    ]);

    result.dispose();
  });

  it("async handler → For children → each child async → nested Show + handler", async () => {
    const handlerOrder: string[] = [];

    interface FileInfo { name: string; content: string }

    function FileTree(props: { key: string }) {
      const out = useAsyncOutput<{ files: FileInfo[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("FileTree");
          await delay(10);
          setOutputs({ files: [
            { name: "app.ts", content: "import foo" },
            { name: "utils.ts", content: "export bar" },
          ]});
        },
      );

      return For({
        each: () => out.files() ?? [],
        keyFn: (f: FileInfo) => f.name,
        children: (file) => h(FileAnalysis, { file: file(), key: file().name }, file().name),
      });
    }

    function FileAnalysis(props: { file: FileInfo; key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { file: props.file, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Analysis:${p.file.name}`);
          await delay(5);
          setOutputs({ summary: `summary-of-${p.file.name}` });
        },
      );

      return Show({
        when: () => out.summary(),
        children: (summary: () => string) =>
          h(FileConnects, { summary: summary(), fileName: props.file.name, key: `conn-${props.key}` }, `conn-${props.key}`),
      });
    }

    function FileConnects(props: { summary: string; fileName: string; key: string }) {
      useAsyncOutput(
        { summary: props.summary, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Connects:${props.fileName}`);
          setOutputs({ deps: ["dep1"] });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(FileTree, { key: "tree" }, "tree"),
      memory,
      "test-async-deep-cascade",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("FileTree");
    expect(handlerOrder.filter(h => h.startsWith("Analysis:")).sort()).toEqual([
      "Analysis:app.ts", "Analysis:utils.ts",
    ]);
    expect(handlerOrder.filter(h => h.startsWith("Connects:")).sort()).toEqual([
      "Connects:app.ts", "Connects:utils.ts",
    ]);

    result.dispose();
  });

  it("async handlers → createEffect aggregates → gates sibling branch (anatomy pattern)", async () => {
    const handlerOrder: string[] = [];
    const [allAnalyzed, setAllAnalyzed] = createSignal(false);
    const analyzed = new Set<string>();
    const fileNames = ["a.ts", "b.ts", "c.ts"];

    function Root() {
      return [
        // Branch 1: file analysis (For with async children)
        ...fileNames.map(name =>
          h(FileWorker, { name, key: name }, name)
        ),
        // Branch 2: anatomy gate — only mounts when all files analyzed
        Show({
          when: allAnalyzed,
          children: () => h(Anatomy, { key: "anatomy" }, "anatomy"),
        }),
      ];
    }

    function FileWorker(props: { name: string; key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Worker:${props.name}`);
          await delay(5);
          setOutputs({ summary: `done-${props.name}` });
        },
      );

      createEffect(() => {
        const s = out.summary();
        if (s) {
          analyzed.add(props.name);
          if (analyzed.size === fileNames.length) {
            setAllAnalyzed(true);
          }
        }
      });

      return <></>;
    }

    function Anatomy(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Anatomy");
          await delay(5);
          setOutputs({ tissues: ["tissue-1"] });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, {}, "root"),
      memory,
      "test-async-gate-pattern",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder.filter(h => h.startsWith("Worker:")).length).toBe(3);
    expect(handlerOrder).toContain("Anatomy");

    result.dispose();
  });

  it("async handler → For → async children → createEffect gates For in sibling (full pipeline)", async () => {
    const handlerOrder: string[] = [];
    const [anatomyDone, setAnatomyDone] = createSignal(false);
    const analyzed = new Set<string>();

    interface Tissue { name: string; cells: string[] }

    function Pipeline(props: { key: string }) {
      const out = useAsyncOutput<{ files: string[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Discovery");
          await delay(5);
          setOutputs({ files: ["f1", "f2", "f3"] });
        },
      );

      return [
        // Stage 1: file analysis via For
        For({
          each: () => out.files() ?? [],
          keyFn: (f: string) => f,
          children: (file) => h(Analyzer, { file: file(), key: file() }, file()),
        }),
        // Stage 2: anatomy, gated on all files
        Show({
          when: anatomyDone,
          children: () => h(AnatomyStage, { key: "anatomy" }, "anatomy"),
        }),
      ];
    }

    function Analyzer(props: { file: string; key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Analyze:${props.file}`);
          await delay(5);
          setOutputs({ summary: `s-${props.file}` });
        },
      );

      createEffect(() => {
        if (out.summary()) {
          analyzed.add(props.file);
          if (analyzed.size === 3) setAnatomyDone(true);
        }
      });

      return <></>;
    }

    function AnatomyStage(props: { key: string }) {
      const out = useAsyncOutput<{ tissues: Tissue[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Anatomy");
          await delay(5);
          setOutputs({ tissues: [
            { name: "core", cells: ["f1", "f2"] },
            { name: "utils", cells: ["f3"] },
          ]});
        },
      );

      return For({
        each: () => out.tissues() ?? [],
        keyFn: (t: Tissue) => t.name,
        children: (tissue) => h(TissueWorker, {
          tissue: tissue(),
          key: tissue().name,
        }, tissue().name),
      });
    }

    function TissueWorker(props: { tissue: Tissue; key: string }) {
      useAsyncOutput(
        { tissue: props.tissue, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Tissue:${p.tissue.name}`);
          await delay(5);
          setOutputs({ organs: [`organ-${p.tissue.name}`] });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Pipeline, { key: "pipeline" }, "pipeline"),
      memory,
      "test-full-pipeline",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("Discovery");
    expect(handlerOrder.filter(h => h.startsWith("Analyze:")).length).toBe(3);
    expect(handlerOrder).toContain("Anatomy");
    expect(handlerOrder.filter(h => h.startsWith("Tissue:")).sort()).toEqual([
      "Tissue:core", "Tissue:utils",
    ]);

    result.dispose();
  });

  it("microtask-resolved async handlers → For → cascading children (mock-like timing)", async () => {
    // This test simulates the timing of mocked async responses —
    // promises that resolve on the microtask queue rather than setTimeout.
    // This is closer to how vitest mocks resolve in test suites.
    const handlerOrder: string[] = [];
    const tick = () => new Promise<void>(r => queueMicrotask(r));

    interface Item { id: string }

    function Parent(props: { key: string }) {
      const out = useAsyncOutput<{ items: Item[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Parent");
          await tick(); // microtask, not setTimeout
          setOutputs({ items: [{ id: "x" }, { id: "y" }, { id: "z" }] });
        },
      );

      return For({
        each: () => out.items() ?? [],
        keyFn: (item: Item) => item.id,
        children: (item) => h(Child, { item: item(), key: item().id }, item().id),
      });
    }

    function Child(props: { item: Item; key: string }) {
      useAsyncOutput(
        { item: props.item, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Child:${p.item.id}`);
          await tick();
          setOutputs({ done: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "p" }, "p"),
      memory,
      "test-microtask-for",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("Parent");
    expect(handlerOrder.filter(h => h.startsWith("Child:")).sort()).toEqual([
      "Child:x", "Child:y", "Child:z",
    ]);

    result.dispose();
  });

  it("zero-delay async handlers with concurrent setOutputs (race condition probe)", async () => {
    // Multiple handlers resolve on the same microtask and call setOutputs
    // nearly simultaneously. Tests whether concurrent signal writes
    // cause fiber tree corruption during collectInstanceNodes.
    const handlerOrder: string[] = [];
    const [gateOpen, setGateOpen] = createSignal(false);
    const completed = new Set<string>();

    function Root() {
      return [
        h(Worker, { id: "w1", key: "w1" }, "w1"),
        h(Worker, { id: "w2", key: "w2" }, "w2"),
        h(Worker, { id: "w3", key: "w3" }, "w3"),
        h(Worker, { id: "w4", key: "w4" }, "w4"),
        h(Worker, { id: "w5", key: "w5" }, "w5"),
        Show({
          when: gateOpen,
          children: () => h(ForConsumer, { key: "fc" }, "fc"),
        }),
      ];
    }

    function Worker(props: { id: string; key: string }) {
      const out = useAsyncOutput<{ result: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Worker:${props.id}`);
          // All resolve on same microtask
          await Promise.resolve();
          setOutputs({ result: `done-${props.id}` });
        },
      );

      createEffect(() => {
        if (out.result()) {
          completed.add(props.id);
          if (completed.size === 5) setGateOpen(true);
        }
      });

      return <></>;
    }

    function ForConsumer(props: { key: string }) {
      const out = useAsyncOutput<{ items: string[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("ForConsumer");
          await Promise.resolve();
          setOutputs({ items: ["i1", "i2", "i3"] });
        },
      );

      return For({
        each: () => out.items() ?? [],
        keyFn: (i: string) => i,
        children: (item) => h(Leaf, { item: item(), key: item() }, item()),
      });
    }

    function Leaf(props: { item: string; key: string }) {
      useAsyncOutput(
        { item: props.item, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Leaf:${p.item}`);
          setOutputs({ processed: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, {}, "root"),
      memory,
      "test-race-condition",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder.filter(h => h.startsWith("Worker:")).length).toBe(5);
    expect(handlerOrder).toContain("ForConsumer");
    expect(handlerOrder.filter(h => h.startsWith("Leaf:")).sort()).toEqual([
      "Leaf:i1", "Leaf:i2", "Leaf:i3",
    ]);

    result.dispose();
  });

  it("deployment state tracks multiple applying nodes", async () => {
    let savedStates: string[][] = [];

    const trackingMemory: Memory = {
      ...new InMemoryMemory(),
      _inner: new InMemoryMemory(),
      async getState(stackName: string) {
        return (this as any)._inner.getState(stackName);
      },
      async saveState(stackName: string, state: any) {
        if (state.applyingNodeIds && state.applyingNodeIds.length > 0) {
          savedStates.push([...state.applyingNodeIds]);
        }
        return (this as any)._inner.saveState(stackName, state);
      },
    } as any;

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(20);
        setOutputs({ done: true });
      });
      return <></>;
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(20);
        setOutputs({ done: true });
      });
      return <></>;
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const result = render(
      () => h(Root, {}, "root"),
      trackingMemory,
      "test-multi-apply",
    );

    await result.ready;

    // At some point, both nodes should have been in the applying set simultaneously
    const hadMultiple = savedStates.some((ids) => ids.length >= 2);
    expect(hadMultiple).toBe(true);

    result.dispose();
  });
});
