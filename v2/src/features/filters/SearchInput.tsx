'use client';

import { useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  onFocus,
  placeholder = 'Zoek een uitje...',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative px-4 pb-2">
      <div className="flex items-center gap-2 rounded-pill bg-bg-secondary px-4">
        {/* Search icon */}
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 text-label-tertiary"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="h-[44px] flex-1 bg-transparent text-[17px] tracking-[-0.025em] text-label placeholder:text-label-tertiary focus:outline-none"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="flex h-[44px] w-6 items-center justify-center text-label-tertiary"
            aria-label="Wis zoekopdracht"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="8" opacity="0.3" />
              <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
