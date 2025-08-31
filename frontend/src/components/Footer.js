import React from 'react';
import './Footer.css';

const Footer = ({ className = "" }) => {
  return (
    <div className={`app-footer ${className}`}>
      ©2025 Worldwide Holidays Ltd. All rights reserved. | Developed by <a href="https://freeai.co.nz" target="_blank" rel="noopener noreferrer">FREEAI</a>
    </div>
  );
};

export default Footer;