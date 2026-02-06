import type { Component } from "solid-js";

const steps = [
  {
    number: "1",
    title: "Declare",
    description:
      "Write JSX that describes what should exist. Components can represent anything — cloud resources, AI models, database connections, IoT devices. You define what your domain looks like.",
  },
  {
    number: "2",
    title: "Reconcile",
    description:
      "The runtime diffs desired state against actual state. It creates what's missing, updates what's changed, and destroys what's been removed — automatically.",
  },
  {
    number: "3",
    title: "Persist",
    description:
      "All state is saved to a pluggable memory backend. Your app survives restarts, picks up where it left off, and skips work already done.",
  },
];

const HowItWorks: Component = () => {
  return (
    <section id="how-it-works" class="section">
      <h2 class="section-title">How It Works</h2>
      <p class="section-subtitle">
        Providers define the rules of any domain. Components declare what should
        exist. The runtime makes it real.
      </p>
      <div class="cards-row">
        {steps.map((step) => (
          <div class="card">
            <div class="card-number">{step.number}</div>
            <h3 class="card-title">{step.title}</h3>
            <p class="card-description">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
