import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string;
  style?: React.CSSProperties;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  width = '240px',
  style
}) => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width,
        ...style
      }}
    >
      <Search
        size={14}
        style={{
          position: 'absolute',
          left: '10px',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '6px 28px 6px 30px',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          color: '#f8fafc',
          fontSize: '12px',
          outline: 'none',
          transition: 'border-color 0.15s ease'
        }}
        onFocus={(e) => (e.target.style.borderColor = '#38bdf8')}
        onBlur={(e) => (e.target.style.borderColor = '#334155')}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
