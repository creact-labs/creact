import type { Component } from "solid-js";

const features = [
  {
    title: "State Persistence",
    description:
      "Every resource's state is automatically saved to a memory backend. Restart your app and it picks up exactly where it left off — no re-provisioning.",
  },
  {
    title: "Reactive Primitives",
    description:
      "createSignal, createEffect, createMemo — the same reactive primitives you know from Solid.js, applied to infrastructure and async operations.",
  },
  {
    title: "Idempotent Operations",
    description:
      "useAsyncOutput receives previous state, so handlers can skip work already done. Run your app 100 times and only the first run provisions resources.",
  },
  {
    title: "Resource Cleanup",
    description:
      "Return a cleanup function from useAsyncOutput and the runtime calls it when a component unmounts. Remove a <WebSite> from your JSX and the bucket is deleted.",
  },
  {
    title: "Context Providers",
    description:
      "Share configuration across your component tree with createContext and useContext. Wrap children in <AWS> and every descendant can access the S3 client.",
  },
  {
    title: "Composable Components",
    description:
      "Build complex systems from simple pieces. A <WebSite> is a <Bucket> with an <S3File> inside. A platform is a <For> loop over <WebSite> components.",
  },
];

const Features: Component = () => {
  return (
    <section id="features" class="section">
      <h2 class="section-title">Features</h2>
      <p class="section-subtitle">
        Everything you need to build reactive execution engines that manage real
        resources.
      </p>
      <div class="features-grid">
        {features.map((feature) => (
          <div class="feature-card">
            <h3 class="feature-title">{feature.title}</h3>
            <p class="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
