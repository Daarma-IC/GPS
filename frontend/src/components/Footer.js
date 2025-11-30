import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <p className="footer-text">
        © 2025 GPS Monitoring System
      </p>
      <div className="footer-links">
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="footer-link"
        >
          GitHub
        </a>
        <a
          href="https://docs.example.com"
          target="_blank"
          rel="noreferrer"
          className="footer-link"
        >
          Documentation
        </a>
      </div>
    </footer>
  );
}

export default Footer;
