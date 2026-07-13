/**
 * Samples for the components-jsx page. Each region is displayed by the
 * website; stub resource components keep every fragment compiling for real.
 */
import { createEffect, createSignal } from "@creact-labs/creact";

function S3Bucket(props: { name: string }) {
  void props;
  return <></>;
}

function CloudFront(props: { origin: string }) {
  void props;
  return <></>;
}

function Database(props: { type: string }) {
  void props;
  return <></>;
}

function Cache(props: { type: string }) {
  void props;
  return <></>;
}

function Server(props: { handler: () => void }) {
  void props;
  return <></>;
}

const app = () => {};

// #region resources
function App() {
  return (
    <>
      <S3Bucket name="my-bucket" />
      <CloudFront origin="my-bucket" />
    </>
  );
}
// #endregion resources

// #region component-functions
function Counter(props: { initial: number }) {
  const [count, setCount] = createSignal(props.initial);

  createEffect(() => {
    console.log("Count is:", count());
  });

  return <></>;
}
// #endregion component-functions

// #region fragments
function Infrastructure() {
  return (
    <>
      <Database type="postgres" />
      <Cache type="redis" />
      <Server handler={app} />
    </>
  );
}
// #endregion fragments

// #region reactive-props
function Display(props: { value: () => number }) {
  createEffect(() => {
    // Re-runs whenever props.value() changes
    console.log("Value:", props.value());
  });

  return <></>;
}

// Usage:
const [count, setCount] = createSignal(0);
<Display value={count} />;
// #endregion reactive-props

// #region children
import { children } from "@creact-labs/creact";

function Wrapper(props: { children: any }) {
  const resolved = children(() => props.children);

  createEffect(() => {
    console.log("Children:", resolved());
  });

  return <></>;
}
// #endregion children

export { App, Counter, Display, Infrastructure, Wrapper, setCount };
