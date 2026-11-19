import React from 'react';
import { SearchInput } from './SearchInput';
import { Select, SelectOption } from './Select';

export type FilterOption = SelectOption;

export interface CustomFilterSelect {
  key: string;
  value: string;
  onChange: (val: string) => void;
  options: FilterOption[];
  ariaLabel?: string;
  width?: string;
  placeholder?: string;
}

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  searchWidth?: string;
  filters?: CustomFilterSelect[];
  extraActions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  searchWidth = '320px',
  filters = [],
  extraActions,
  style
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          width={searchWidth}
        />

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value}
            options={filter.options}
            onChange={(e) => filter.onChange(e.target.value)}
            placeholder={filter.placeholder}
            width={filter.width || '200px'}
            enableSearch={false}
          />
        ))}
      </div>

      {extraActions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {extraActions}
        </div>
      )}
    </div>
  );
};
