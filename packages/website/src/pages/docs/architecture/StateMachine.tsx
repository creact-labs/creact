import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";

const StateMachine: Component = () => {
  return (
    <>
      <h1>State Machine</h1>
      <p class="docs-description">
        Each component instance moves through deployment stages: pending,
        applying, deployed, or failed.
      </p>

      <DocHeading level={2} id="resource-states">
        Resource States
      </DocHeading>
      <p>
        Each resource (instance node) has a <code>ResourceState</code>:
      </p>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>pending</code>
            </td>
            <td>Resource has been declared but handler hasn't run yet.</td>
          </tr>
          <tr>
            <td>
              <code>applying</code>
            </td>
            <td>Handler is currently executing.</td>
          </tr>
          <tr>
            <td>
              <code>deployed</code>
            </td>
            <td>Handler finished successfully. Outputs are available.</td>
          </tr>
          <tr>
            <td>
              <code>failed</code>
            </td>
            <td>Handler threw an error. Deployment failed.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="deployment-status">
        Deployment Status
      </DocHeading>
      <p>
        The overall deployment also tracks a <code>DeploymentStatus</code> with
        the same values: <code>pending</code>, <code>applying</code>,{" "}
        <code>deployed</code>, <code>failed</code>. This is persisted to Memory
        and used for crash recovery. If the status is <code>applying</code> on
        startup, the previous deployment was interrupted.
      </p>

      <DocHeading level={2} id="transitions">
        Transitions
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={`Resource states:
  pending → applying → deployed
                    ↘ failed

Deployment lifecycle:
  applying → deployed   (all resources applied successfully)
  applying → failed     (a resource handler threw an error)`}
        filename="State transitions"
      />

      <p>
        When a resource is removed from the tree, its cleanup handler runs and
        it is deleted from the state map entirely. There is no separate
        "removing" or "removed" state.
      </p>

      <DocHeading level={2} id="persistence">
        Persistence
      </DocHeading>
      <p>
        The state machine state is part of what gets persisted to Memory. On
        restart, CReact restores resource states from saved nodes. Nodes with
        outputs are treated as <code>deployed</code>, others default to{" "}
        <code>pending</code>. The deployment status tells CReact whether the
        previous run completed or was interrupted mid-apply.
      </p>

      <DocHeading level={2} id="crash-recovery">
        Crash Recovery
      </DocHeading>
      <p>
        <code>applyingNodeId</code> records which node was being applied when a
        crash occurred. On restart, <code>canResume()</code> checks if the
        deployment status is <code>applying</code>, and{" "}
        <code>getInterruptedNodeId()</code> returns that node's ID. The runtime
        resumes from that node instead of re-applying everything.
      </p>

      <DocHeading level={2} id="audit-log">
        Audit Log
      </DocHeading>
      <p>
        When <code>enableAuditLog</code> is set and the Memory backend supports
        it, state transitions are recorded as <code>AuditLogEntry</code>{" "}
        records. Actions logged: <code>deploy_start</code>,{" "}
        <code>deploy_complete</code>, <code>deploy_failed</code>,{" "}
        <code>resource_applied</code>, <code>resource_destroyed</code>.
      </p>

      <DocHeading level={2} id="source">
        Source
      </DocHeading>
      <p>
        Implementation in <code>runtime/src/state-machine.ts</code>.
      </p>
    </>
  );
};

export default StateMachine;
