import React from 'react';

/**
 * On-brand artisanal menu icon:
 * Staggered 3-line rhythm (18px, 11px, 15px) with rounded stroke caps.
 * Gives an authentic editorial studio feel instead of generic stock hamburger bars.
 */
export function BrandMenuIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 18 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M1.5 2H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M1.5 7H10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M1.5 12H14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * On-brand sidebar collapse/retract icon:
 * Architectural framed studio panel with an inward chevron retreat indicator.
 */
export function BrandSidebarRetractIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2V14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 6L9 8L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * On-brand sidebar expand icon:
 * Architectural framed studio panel with an outward chevron release indicator.
 */
export function BrandSidebarExpandIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2V14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 6L11 8L9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * On-brand dismiss / close cross icon:
 * Crisp geometry with rounded end caps and gentle hover rotation.
 */
export function BrandDismissIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 2L10 10M10 2L2 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
