import type { Component } from "solid-js";

const Footer: Component = () => {
  return (
    <footer class="footer">
      <div class="footer-content">
        <span class="footer-sep">&middot;</span>
        <a
          href="https://github.com/creact-labs/creact"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
        <span class="footer-sep">&middot;</span>
        <span>Apache 2.0</span>
      </div>
    </footer>
  );
};

export default Footer;
