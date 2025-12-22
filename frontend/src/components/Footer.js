import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <p className="footer-text">
        &copy; {new Date().getFullYear()} GPS Tracker by Kelompok Nusa Mesh Team
      </p>
    </footer>
  );
}

export default Footer;
