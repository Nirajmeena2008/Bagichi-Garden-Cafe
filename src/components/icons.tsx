import React from 'react';

export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="10.6" cy="10.6" r="6.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="m15.4 15.4 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const Chevron = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" {...props}>
    <path d="m3 4.6 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Star = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" {...props}>
    <path d="M8 1.4l1.85 3.9 4.15.56-3.05 2.9.78 4.24L8 10.96 4.27 13l.78-4.24L2 5.86l4.15-.56L8 1.4Z" />
  </svg>
);

export const MenuIcon = ({ open = false, size = 21, ...props }: { open?: boolean; size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
    {open ? (
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    ) : (
      <path d="M4 9h16M4 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    )}
  </svg>
);