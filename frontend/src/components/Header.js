import React from 'react';

function Header() {
  return (
    <header style={{
      background: 'linear-gradient(90deg, rgba(15, 31, 15, 0.95) 0%, rgba(20, 41, 20, 0.9) 50%, rgba(15, 31, 15, 0.95) 100%)',
      borderBottom: '1px solid rgba(132, 204, 22, 0.15)',
      padding: '16px 24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em',
        }}>
          GPS Tracking System
        </h1>
      </div>
    </header>
  );
}

export default Header;
