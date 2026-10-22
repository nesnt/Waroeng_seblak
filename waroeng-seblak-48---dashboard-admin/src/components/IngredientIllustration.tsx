import React, { useState } from 'react';
import { IngredientCategory } from '../types';

/**
 * Menghasilkan gambar SVG Data-URI berkualitas tinggi dan spesifik
 * sesuai dengan nama bahan atau kategori bahan seblak.
 * Mendukung kategori: Kerupuk, Frozen Food, Keringan, Daging, Minuman, Special.
 */
export function getIngredientSvgDataUri(name: string, category: IngredientCategory): string {
  const lower = name.toLowerCase();

  let bgStart = '#fff7ed';
  let bgEnd = '#ffedd5';
  let accent = '#ea580c';
  let illustration = '';

  if (category === 'Kerupuk') {
    bgStart = '#fff7ed';
    bgEnd = '#fed7aa';
    accent = '#ea580c';
  } else if (category === 'Frozen Food') {
    bgStart = '#f0f9ff';
    bgEnd = '#bae6fd';
    accent = '#0284c7';
  } else if (category === 'Keringan') {
    bgStart = '#fefce8';
    bgEnd = '#fde68a';
    accent = '#d97706';
  } else if (category === 'Daging') {
    bgStart = '#fef2f2';
    bgEnd = '#fecaca';
    accent = '#dc2626';
  } else if (category === 'Minuman') {
    bgStart = '#ecfdf5';
    bgEnd = '#a7f3d0';
    accent = '#059669';
  } else if (category === 'Special') {
    bgStart = '#faf5ff';
    bgEnd = '#e9d5ff';
    accent = '#9333ea';
  }

  // Gambar spesifik per bahan
  if (lower.includes('kerupuk mawar')) {
    illustration = `
      <g transform="translate(160, 100)">
        <circle cx="0" cy="0" r="46" fill="#fb7185" opacity="0.25"/>
        <circle cx="-18" cy="-8" r="24" fill="#fff1f2" stroke="#f43f5e" stroke-width="5"/>
        <circle cx="18" cy="-8" r="24" fill="#fff1f2" stroke="#f43f5e" stroke-width="5"/>
        <circle cx="0" cy="18" r="24" fill="#fff1f2" stroke="#f43f5e" stroke-width="5"/>
        <circle cx="0" cy="0" r="18" fill="#ffe4e6" stroke="#e11d48" stroke-width="4"/>
        <circle cx="-6" cy="-4" r="3" fill="#e11d48"/>
        <circle cx="6" cy="-4" r="3" fill="#e11d48"/>
        <circle cx="0" cy="6" r="3" fill="#e11d48"/>
      </g>
    `;
  } else if (lower.includes('rantai') || lower.includes('tangga')) {
    illustration = `
      <g transform="translate(160, 100)">
        <rect x="-46" y="-22" width="92" height="44" rx="14" fill="#fef08a" stroke="#ea580c" stroke-width="4.5"/>
        <rect x="-32" y="-10" width="16" height="20" rx="5" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>
        <rect x="-8" y="-10" width="16" height="20" rx="5" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>
        <rect x="16" y="-10" width="16" height="20" rx="5" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>
      </g>
    `;
  } else if (lower.includes('kerupuk')) {
    illustration = `
      <g transform="translate(160, 100)">
        <ellipse cx="-22" cy="8" rx="32" ry="22" transform="rotate(-20 -22 8)" fill="#fde047" stroke="#ea580c" stroke-width="4"/>
        <ellipse cx="20" cy="-6" rx="32" ry="22" transform="rotate(15 20 -6)" fill="#fef08a" stroke="#f97316" stroke-width="4"/>
        <ellipse cx="0" cy="14" rx="34" ry="23" fill="#fef9c3" stroke="#ea580c" stroke-width="4.5"/>
        <path d="M-16 14 Q0 6 16 14" stroke="#f59e0b" stroke-width="3" fill="none" stroke-linecap="round"/>
      </g>
    `;
  } else if (lower.includes('makaroni')) {
    illustration = `
      <g transform="translate(160, 100)">
        <path d="M-38 -10 C-38 -32, -8 -32, -8 -10 C-8 2, -24 2, -24 -10" fill="none" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/>
        <path d="M8 -16 C8 -38, 38 -38, 38 -16 C38 -4, 22 -4, 22 -16" fill="none" stroke="#fbbf24" stroke-width="14" stroke-linecap="round"/>
        <path d="M-15 18 C-15 -4, 18 -4, 18 18 C18 30, 2 30, 2 18" fill="none" stroke="#d97706" stroke-width="14" stroke-linecap="round"/>
      </g>
    `;
  } else if (lower.includes('bakso')) {
    illustration = `
      <g transform="translate(160, 100)">
        <circle cx="-26" cy="10" r="24" fill="#a8a29e" stroke="#78716c" stroke-width="3"/>
        <circle cx="26" cy="10" r="24" fill="#a8a29e" stroke="#78716c" stroke-width="3"/>
        <circle cx="0" cy="-8" r="28" fill="#d6d3d1" stroke="#57534e" stroke-width="3.5"/>
        <path d="M-12 -18 L12 -6 M-10 -6 L10 -18" stroke="#57534e" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="-32" cy="4" r="3" fill="#78716c"/>
        <circle cx="20" cy="6" r="3" fill="#78716c"/>
      </g>
    `;
  } else if (lower.includes('sosis')) {
    illustration = `
      <g transform="translate(160, 100)">
        <rect x="-48" y="-12" width="96" height="26" rx="13" transform="rotate(-18)" fill="#ef4444" stroke="#b91c1c" stroke-width="3.5"/>
        <line x1="-22" y1="-10" x2="-14" y2="6" stroke="#fca5a5" stroke-width="3" stroke-linecap="round"/>
        <line x1="0" y1="-16" x2="8" y2="0" stroke="#fca5a5" stroke-width="3" stroke-linecap="round"/>
        <line x1="22" y1="-22" x2="30" y2="-6" stroke="#fca5a5" stroke-width="3" stroke-linecap="round"/>
        <rect x="-42" y="8" width="88" height="24" rx="12" transform="rotate(10)" fill="#dc2626" stroke="#991b1b" stroke-width="3.5"/>
      </g>
    `;
  } else if (lower.includes('chikuwa') || lower.includes('crab')) {
    illustration = `
      <g transform="translate(160, 100)">
        <rect x="-44" y="-16" width="88" height="32" rx="12" transform="rotate(-10)" fill="#fff7ed" stroke="#ea580c" stroke-width="3.5"/>
        <rect x="-24" y="-16" width="48" height="32" transform="rotate(-10)" fill="#fb923c" opacity="0.85"/>
        <ellipse cx="40" cy="-7" rx="6" ry="14" transform="rotate(-10)" fill="#fed7aa" stroke="#c2410c" stroke-width="2.5"/>
      </g>
    `;
  } else if (lower.includes('odeng')) {
    illustration = `
      <g transform="translate(160, 100)">
        <line x1="0" y1="-42" x2="0" y2="42" stroke="#92400e" stroke-width="5" stroke-linecap="round"/>
        <path d="M-28 -22 Q28 -12 -28 0 Q28 12 -28 24" fill="none" stroke="#f59e0b" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M-28 -22 Q28 -12 -28 0 Q28 12 -28 24" fill="none" stroke="#fde68a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    `;
  } else if (lower.includes('ceker') || lower.includes('sayap') || lower.includes('tulang')) {
    illustration = `
      <g transform="translate(160, 105)">
        <path d="M-8 30 L-6 -5 L-30 -28 M-6 -5 L0 -36 M-6 -5 L24 -26 M-6 -5 L32 -4" stroke="#ea580c" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M-8 30 L-6 -5 L-30 -28 M-6 -5 L0 -36 M-6 -5 L24 -26 M-6 -5 L32 -4" stroke="#fdba74" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="-18" cy="10" r="4" fill="#dc2626"/>
        <circle cx="16" cy="-12" r="3.5" fill="#dc2626"/>
      </g>
    `;
  } else if (lower.includes('telur')) {
    illustration = `
      <g transform="translate(160, 100)">
        <ellipse cx="-20" cy="4" rx="24" ry="30" transform="rotate(-12 -20 4)" fill="#fed7aa" stroke="#c2410c" stroke-width="3"/>
        <path d="M-4 6 C-4 -18, 42 -20, 44 6 C46 28, 6 34, -4 6 Z" fill="#ffffff" stroke="#e7e5e4" stroke-width="3"/>
        <circle cx="20" cy="8" r="13" fill="#f97316"/>
        <circle cx="16" cy="4" r="4" fill="#ffedd5"/>
      </g>
    `;
  } else if (lower.includes('dumpling') || lower.includes('keju')) {
    illustration = `
      <g transform="translate(160, 100)">
        <path d="M-38 22 C-38 -22, 38 -22, 38 22 Z" fill="#fef3c7" stroke="#d97706" stroke-width="3.5"/>
        <path d="M-24 22 C-24 -8, 24 -8, 24 22" fill="#facc15" opacity="0.7"/>
        <circle cx="0" cy="-12" r="7" fill="#f59e0b"/>
        <path d="M-18 6 L-18 20 M0 2 L0 20 M18 6 L18 20" stroke="#d97706" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    `;
  } else if (lower.includes('pilus')) {
    illustration = `
      <g transform="translate(160, 100)">
        <circle cx="-24" cy="-8" r="10" fill="#fde047" stroke="#ca8a04" stroke-width="2.5"/>
        <circle cx="0" cy="-16" r="11" fill="#fef08a" stroke="#ca8a04" stroke-width="2.5"/>
        <circle cx="24" cy="-6" r="10" fill="#fde047" stroke="#ca8a04" stroke-width="2.5"/>
        <circle cx="-14" cy="14" r="11" fill="#fef08a" stroke="#ca8a04" stroke-width="2.5"/>
        <circle cx="14" cy="14" r="10" fill="#fde047" stroke="#ca8a04" stroke-width="2.5"/>
      </g>
    `;
  } else if (lower.includes('siomay') || lower.includes('batagor') || lower.includes('cuanki')) {
    illustration = `
      <g transform="translate(160, 100)">
        <polygon points="-38,16 -22,-22 22,-22 38,16" fill="#fde68a" stroke="#b45309" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="0" cy="4" r="14" fill="#d97706"/>
        <path d="M-26 -16 L-12 4 M26 -16 L12 4" stroke="#b45309" stroke-width="2.5"/>
      </g>
    `;
  } else if (lower.includes('mie') || lower.includes('kwetiau') || lower.includes('bihun')) {
    illustration = `
      <g transform="translate(160, 100)">
        <rect x="-44" y="-26" width="88" height="54" rx="16" fill="#fef08a" stroke="#ca8a04" stroke-width="3.5"/>
        <path d="M-32 -12 Q-16 -22 0 -12 T32 -12" fill="none" stroke="#eab308" stroke-width="4" stroke-linecap="round"/>
        <path d="M-32 0 Q-16 -10 0 0 T32 0" fill="none" stroke="#ca8a04" stroke-width="4" stroke-linecap="round"/>
        <path d="M-32 12 Q-16 2 0 12 T32 12" fill="none" stroke="#eab308" stroke-width="4" stroke-linecap="round"/>
      </g>
    `;
  } else if (lower.includes('enoki') || lower.includes('jamur')) {
    illustration = `
      <g transform="translate(160, 105)">
        <path d="M-16 26 L-24 -18 M-6 26 L-8 -24 M6 26 L8 -24 M16 26 L24 -18" stroke="#fafaf9" stroke-width="6" stroke-linecap="round"/>
        <path d="M-16 26 L-24 -18 M-6 26 L-8 -24 M6 26 L8 -24 M16 26 L24 -18" stroke="#a8a29e" stroke-width="2" stroke-linecap="round"/>
        <circle cx="-24" cy="-22" r="8" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
        <circle cx="-8" cy="-28" r="9" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
        <circle cx="8" cy="-28" r="9" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
        <circle cx="24" cy="-22" r="8" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
        <rect x="-22" y="18" width="44" height="14" rx="5" fill="#fde68a" stroke="#b45309" stroke-width="2.5"/>
      </g>
    `;
  } else if (category === 'Minuman' || lower.includes('teh') || lower.includes('jeruk') || lower.includes('air')) {
    illustration = `
      <g transform="translate(160, 104)">
        <line x1="10" y1="-44" x2="-4" y2="18" stroke="#ea580c" stroke-width="5" stroke-linecap="round"/>
        <polygon points="-26,-22 26,-22 20,32 -20,32" fill="${
          lower.includes('jeruk') ? '#fde047' : lower.includes('air') ? '#bae6fd' : '#d97706'
        }" stroke="#78350f" stroke-width="3.5" stroke-linejoin="round"/>
        <ellipse cx="0" cy="-22" rx="28" ry="6" fill="#ffffff" stroke="#78350f" stroke-width="3"/>
        <rect x="-12" y="-10" width="10" height="10" rx="2" fill="#ffffff" opacity="0.75"/>
        <rect x="4" y="-6" width="10" height="10" rx="2" fill="#ffffff" opacity="0.75"/>
      </g>
    `;
  } else {
    illustration = `
      <g transform="translate(160, 102)">
        <ellipse cx="0" cy="-16" rx="38" ry="10" fill="#fed7aa" stroke="#c2410c" stroke-width="3"/>
        <path d="M-38 -16 L-26 26 C-24 34, 24 34, 26 26 L38 -16 Z" fill="#ffedd5" stroke="#c2410c" stroke-width="3.5"/>
        <circle cx="0" cy="6" r="10" fill="#ea580c"/>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}"/>
        <stop offset="100%" stop-color="${bgEnd}"/>
      </linearGradient>
    </defs>
    <rect width="320" height="200" fill="url(#bg)"/>
    <circle cx="280" cy="30" r="60" fill="${accent}" opacity="0.08"/>
    <circle cx="40" cy="170" r="70" fill="${accent}" opacity="0.07"/>
    ${illustration}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface IngredientImageProps {
  name: string;
  category: IngredientCategory;
  imageUrl?: string;
  className?: string;
}

export const IngredientImage: React.FC<IngredientImageProps> = ({
  name,
  category,
  imageUrl,
  className = 'w-full h-40 object-cover',
}) => {
  const [imgError, setImgError] = useState(false);
  const fallbackSrc = getIngredientSvgDataUri(name, category);
  const activeSrc = !imgError && imageUrl && imageUrl.trim() !== '' ? imageUrl : fallbackSrc;

  return (
    <img
      src={activeSrc}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={className}
    />
  );
};
