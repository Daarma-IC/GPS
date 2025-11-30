import React from 'react';

function Footer() {
  return (
    <footer style={{
      background: 'linear-gradient(90deg, rgba(15, 31, 15, 0.95) 0%, rgba(20, 41, 20, 0.9) 50%, rgba(15, 31, 15, 0.95) 100%)',
      borderTop: '1px solid rgba(132, 204, 22, 0.15)',
      padding: '12px 24px',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '0.85rem',
      color: '#94a3b8',
    }}>
      <p style={{ margin: 0, fontWeight: 500 }}>
        © 2025 GPS Monitoring System
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          style={{
            color: '#4ade80',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => e.target.style.color = '#6ee7b7'}
          onMouseLeave={(e) => e.target.style.color = '#4ade80'}
        >
          GitHub
        </a>
        <a
          href="https://docs.example.com"
          target="_blank"
          rel="noreferrer"
          style={{
            color: '#4ade80',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'color 0.3s ease',
          }}
          onMouseEnter={(e) => e.target.style.color = '#6ee7b7'}
          onMouseLeave={(e) => e.target.style.color = '#4ade80'}
        >
          Documentation
        </a>
      </div>
    </footer>
  );
}

export default Footer;
