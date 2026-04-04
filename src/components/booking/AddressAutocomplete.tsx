'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (coords: { lat: number; lng: number } | null) => void;
  placeholder?: string;
  className?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address',
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=za&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, []);

  function handleInputChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleSelect(result: NominatimResult) {
    onChange(result.display_name);
    setShowDropdown(false);
    setSuggestions([]);
    if (onPlaceSelect) {
      onPlaceSelect({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { setFocused(true); if (suggestions.length > 0) setShowDropdown(true); }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showDropdown && focused && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #e8e8e5',
          borderRadius: '12px',
          marginTop: '4px',
          zIndex: 1000,
          overflow: 'hidden',
          maxHeight: '220px',
          overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f0f0ee' : 'none',
                background: 'transparent',
                textAlign: 'left',
                fontSize: '13px',
                color: '#333',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {s.display_name.length > 80 ? s.display_name.substring(0, 80) + '...' : s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
