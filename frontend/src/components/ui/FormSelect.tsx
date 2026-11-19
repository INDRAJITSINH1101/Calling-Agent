import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, AlertCircle, Search, Check, X } from 'lucide-react';

export interface FormSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  label?: string;
  required?: boolean;
  options?: FormSelectOption[];
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onSelect?: (value: string | number) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  width?: string;
  fullWidth?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  enableSearch?: boolean;
}

// Helper to extract text label from React children nodes
const extractTextFromChildren = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromChildren).join('');
  if (React.isValidElement(node)) return extractTextFromChildren((node.props as any)?.children);
  return '';
};

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  required,
  options,
  value,
  defaultValue,
  onChange,
  onSelect,
  name,
  placeholder,
  error,
  helperText,
  width,
  fullWidth = true,
  style,
  children,
  disabled = false,
  onFocus,
  onBlur,
  enableSearch = true
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 220 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const containerWidth = width || (fullWidth ? '100%' : 'auto');

  // Extract options from options prop or React children (<option>)
  const parsedOptions: FormSelectOption[] = useMemo(() => {
    let rawOptions: FormSelectOption[] = [];
    if (options && options.length > 0) {
      rawOptions = options;
    } else if (children) {
      const extracted: FormSelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const props = child.props as any;
          if (child.type === 'option') {
            extracted.push({
              value: props.value !== undefined ? props.value : '',
              label: extractTextFromChildren(props.children) || String(props.value ?? ''),
              disabled: props.disabled
            });
          }
        }
      });
      rawOptions = extracted;
    }

    // Filter out dummy placeholder options like "-- Choose Existing Contact --" or "Choose..."
    return rawOptions.filter((opt) => !opt.label.toLowerCase().includes('choose'));
  }, [options, children]);

  // Current active value (support controlled and defaultValue fallback)
  const currentValue = value !== undefined ? value : defaultValue;

  // Selected option resolution
  const selectedOption = useMemo(() => {
    if (currentValue === undefined || currentValue === null) return undefined;
    return parsedOptions.find((opt) => String(opt.value) === String(currentValue));
  }, [parsedOptions, currentValue]);

  // Display label calculation
  const displayLabel = useMemo(() => {
    if (selectedOption) {
      return selectedOption.label;
    }
    if (placeholder) {
      return placeholder;
    }
    if (parsedOptions.length > 0 && (currentValue === undefined || currentValue === '')) {
      const emptyOpt = parsedOptions.find((o) => String(o.value) === '');
      if (emptyOpt) return emptyOpt.label;
    }
    return placeholder || 'Select Option';
  }, [selectedOption, placeholder, parsedOptions, currentValue]);

  // Real-time search filter
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return parsedOptions;
    const lower = searchTerm.toLowerCase().trim();
    return parsedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        String(opt.value).toLowerCase().includes(lower)
    );
  }, [parsedOptions, searchTerm]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
        onBlur?.(e);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur]);

  // Compute portal coordinates and auto-focus search input when dropdown opens
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        return;
      }
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward = spaceBelow < 240 && spaceAbove > 200;

      setCoords({
        top: shouldOpenUpward ? undefined : rect.bottom + 4,
        bottom: shouldOpenUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: Math.max(rect.width, 220)
      });
    };

    updatePosition();

    // Listen to resize and capture scroll events across any parent modal/container
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    if (enableSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, enableSearch]);

  const handleSelect = (val: string | number) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          value: String(val),
          name: name || ''
        }
      };
      onChange(syntheticEvent);
    }
    onSelect?.(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getBorderColor = () => {
    if (error) return '#ef4444';
    if (isOpen) return '#38bdf8';
    if (isHovered) return 'rgba(255, 255, 255, 0.25)';
    return 'rgba(255, 255, 255, 0.12)';
  };

  const getBoxShadow = () => {
    if (error) return '0 0 0 2px rgba(239, 68, 68, 0.2)';
    if (isOpen) return '0 0 0 2px rgba(56, 189, 248, 0.25)';
    return 'none';
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        width: containerWidth,
        minWidth: 0,
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: isOpen ? 60 : undefined
      }}
    >
      {/* Hidden input for standard form serialization */}
      {name && <input type="hidden" name={name} value={currentValue !== undefined ? String(currentValue) : ''} />}

      {/* Optional Field Label */}
      {label && (
        <label
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            userSelect: 'none'
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span>}
        </label>
      )}

      {/* Custom Trigger Button */}
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) onFocus?.(null);
            setIsOpen(!isOpen);
          }
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 34px 0 12px',
          backgroundColor: '#1e293b',
          border: `1px solid ${getBorderColor()}`,
          borderRadius: '8px',
          color: disabled ? '#64748b' : '#ffffff',
          fontSize: '12px',
          fontWeight: 500,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: getBoxShadow(),
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
          height: '38px',
          minHeight: '38px',
          ...style
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selectedOption ? '#ffffff' : '#94a3b8',
            flex: 1,
            minWidth: 0,
            textAlign: 'left'
          }}
        >
          {displayLabel}
        </span>

        {/* Chevron Down / Up Indicator */}
        <div
          style={{
            position: 'absolute',
            right: '10px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOpen ? '#38bdf8' : '#94a3b8',
            transition: 'transform 0.2s ease, color 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none'
          }}
        >
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Custom Dropdown Menu Panel via Portal to prevent any parent overflow clipping */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: '220px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '10px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 8px 24px rgba(0, 0, 0, 0.8)',
              zIndex: 999999,
              overflow: 'hidden',
              backdropFilter: 'blur(16px)',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Search Input Filter at Start */}
          {enableSearch && (
            <div
              style={{
                padding: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: '#0f172a',
                position: 'sticky',
                top: 0,
                zIndex: 2
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search
                  size={13}
                  style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none' }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  style={{
                    width: '100%',
                    padding: '6px 28px 6px 30px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 5-item visible scrollable options list */}
          <div
            style={{
              maxHeight: '185px', // ~5 items visible before scrolling (37px per item)
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '14px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(currentValue);
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    disabled={opt.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!opt.disabled) {
                        handleSelect(opt.value);
                      }
                    }}
                    title={opt.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      width: '100%',
                      minHeight: '36px',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      color: opt.disabled ? '#475569' : isSelected ? '#38bdf8' : '#e2e8f0',
                      fontSize: '12px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !opt.disabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !opt.disabled) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={14} color="#38bdf8" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Error or Helper Text */}
      {error ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#ef4444',
            marginTop: '2px'
          }}
        >
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{helperText}</span>
      ) : null}
    </div>
  );
};

export default FormSelect;
