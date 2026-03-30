'use client';

import { Command } from 'cmdk';
import Fuse from 'fuse.js';
import { useState, useMemo, useCallback, useRef } from 'react';
import { LOCATION_TYPE_LABELS, TYPE_COLORS } from '@/domain/enums';
import type { LocationType } from '@/domain/enums';
import type { LocationSummary } from '@/domain/types';

interface SearchCommandProps {
  /** All locations (unfiltered) for fuzzy search */
  locations: LocationSummary[];
  /** Called when a search result is selected */
  onSelect: (location: LocationSummary) => void;
  /** Called when the query text changes (for filter integration) */
  onQueryChange: (query: string) => void;
  /** Called when the input gains focus */
  onFocus?: () => void;
}

export function SearchCommand({ locations, onSelect, onQueryChange, onFocus }: SearchCommandProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(locations, {
        keys: [
          { name: 'name', weight: 0.7 },
          { name: 'region', weight: 0.2 },
          { name: 'type', weight: 0.1 },
        ],
        threshold: 0.3,
        minMatchCharLength: 2,
      }),
    [locations],
  );

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    return fuse.search(query, { limit: 12 }).map((r) => r.item);
  }, [query, fuse]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<string, LocationSummary[]> = {};
    for (const loc of results) {
      if (!groups[loc.type]) groups[loc.type] = [];
      groups[loc.type].push(loc);
    }
    return Object.entries(groups);
  }, [results]);

  const handleValueChange = useCallback(
    (value: string) => {
      setQuery(value);
      onQueryChange(value);
    },
    [onQueryChange],
  );

  const handleSelect = useCallback(
    (value: string) => {
      // value format: "name-id"
      const dashIdx = value.lastIndexOf('-');
      if (dashIdx < 0) return;
      const id = Number(value.slice(dashIdx + 1));
      const loc = locations.find((l) => l.id === id);
      if (loc) {
        setOpen(false);
        setQuery('');
        onQueryChange('');
        onSelect(loc);
      }
    },
    [locations, onSelect, onQueryChange],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange]);

  const showResults = open && query.length >= 2;

  return (
    <div className="relative px-4 pb-2">
      <Command shouldFilter={false} className="relative">
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

          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={handleValueChange}
            onFocus={() => {
              setOpen(true);
              onFocus?.();
            }}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Zoek een uitje..."
            className="h-[44px] flex-1 bg-transparent text-[17px] tracking-[-0.025em] text-label placeholder:text-label-tertiary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-[44px] w-6 items-center justify-center text-label-tertiary"
              aria-label="Wis zoekopdracht"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="8" opacity="0.3" />
                <path
                  d="M5.5 5.5l5 5M10.5 5.5l-5 5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showResults && results.length > 0 && (
          <Command.List className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-y-auto rounded-xl bg-bg-primary shadow-card">
            {grouped.map(([type, locs]) => (
              <Command.Group
                key={type}
                heading={LOCATION_TYPE_LABELS[type as LocationType] ?? type}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-label-tertiary"
              >
                {locs.map((loc) => (
                  <Command.Item
                    key={loc.id}
                    value={`${loc.name}-${loc.id}`}
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[15px] text-label aria-selected:bg-bg-secondary"
                  >
                    <span
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white"
                      style={{
                        backgroundColor: TYPE_COLORS[loc.type as LocationType] ?? 'var(--color-label-secondary)',
                      }}
                    >
                      {(LOCATION_TYPE_LABELS[loc.type as LocationType] ?? '?')[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{loc.name}</span>
                      <span className="ml-2 text-[13px] text-label-secondary">{loc.region}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        )}

        {/* Empty state */}
        {showResults && results.length === 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl bg-bg-primary px-4 py-3 text-center text-[15px] text-label-secondary shadow-card">
            Geen resultaten voor &ldquo;{query}&rdquo;
          </div>
        )}
      </Command>
    </div>
  );
}
