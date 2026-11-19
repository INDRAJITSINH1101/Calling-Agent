import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

export interface TimePickerProps {
  label?: string;
  value?: string; // 24-hour format: "HH:MM", e.g. "09:00" or "19:00"
  onChange?: (time24: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  align?: 'left' | 'right';
  dropPosition?: 'top' | 'bottom';
  style?: React.CSSProperties;
}

// Convert "19:00" -> { hour12: 7, minute: 0, period: "PM", display: "07:00 PM" }
const parse24To12 = (val?: string) => {
  if (!val || !val.includes(':')) {
    return { hour12: 9, minute: 0, period: 'AM' as const, display: '09:00 AM' };
  }
  const [hStr, mStr] = val.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) h = 9;

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;

  const hDisplay = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  const mDisplay = m < 10 ? `0${m}` : `${m}`;

  return {
    hour12,
    minute: m,
    period,
    display: `${hDisplay}:${mDisplay} ${period}`
  };
};

// Convert hour12, minute, period -> "19:00"
const format12To24 = (hour12: number, minute: number, period: 'AM' | 'PM') => {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = minute < 10 ? `0${minute}` : `${minute}`;
  return `${hStr}:${mStr}`;
};

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value = '09:00',
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Select Time',
  align = 'left',
  dropPosition = 'top',
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parse24To12(value), [value]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Adjust Hours
  const prevHour = parsed.hour12 === 1 ? 12 : parsed.hour12 - 1;
  const nextHour = parsed.hour12 === 12 ? 1 : parsed.hour12 + 1;

  const handleHourUp = () => {
    const newH = parsed.hour12 === 1 ? 12 : parsed.hour12 - 1;
    onChange?.(format12To24(newH, parsed.minute, parsed.period));
  };

  const handleHourDown = () => {
    const newH = parsed.hour12 === 12 ? 1 : parsed.hour12 + 1;
    onChange?.(format12To24(newH, parsed.minute, parsed.period));
  };

  const handleSelectHour = (h: number) => {
    onChange?.(format12To24(h, parsed.minute, parsed.period));
  };

  // Adjust Minutes
  const prevMinute = (parsed.minute - 1 + 60) % 60;
  const nextMinute = (parsed.minute + 1) % 60;

  const handleMinuteUp = () => {
    const newM = (parsed.minute - 1 + 60) % 60;
    onChange?.(format12To24(parsed.hour12, newM, parsed.period));
  };

  const handleMinuteDown = () => {
    const newM = (parsed.minute + 1) % 60;
    onChange?.(format12To24(parsed.hour12, newM, parsed.period));
  };

  const handleSelectMinute = (m: number) => {
    onChange?.(format12To24(parsed.hour12, m, parsed.period));
  };

  // Adjust AM/PM
  const handleTogglePeriod = () => {
    const newP: 'AM' | 'PM' = parsed.period === 'AM' ? 'PM' : 'AM';
    onChange?.(format12To24(parsed.hour12, parsed.minute, newP));
  };

  const formatNumber = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      {/* Optional Label */}
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

      {/* Trigger Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '38px',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          backgroundColor: '#1e293b',
          border: isOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isOpen ? '0 0 0 2px rgba(56, 189, 248, 0.25)' : 'none',
          borderRadius: '8px',
          color: '#f8fafc',
          fontSize: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Clock size={14} color="#38bdf8" />
          <span style={{ fontWeight: 600, letterSpacing: '0.3px', color: '#f8fafc', fontSize: '12px' }}>
            {value ? parsed.display : placeholder}
          </span>
        </div>
        {isOpen ? <ChevronUp size={13} color="#38bdf8" /> : <ChevronDown size={13} color="#94a3b8" />}
      </button>

      {/* Compact Tumbler Dropdown: Opens ABOVE trigger so it is never cut off */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(dropPosition === 'top'
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            width: '186px',
            backgroundColor: '#0d1527',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.9), 0 0 15px rgba(56, 189, 248, 0.15)',
            zIndex: 1000,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backdropFilter: 'blur(16px)',
            userSelect: 'none'
          }}
        >
          {/* Header Title */}
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#38bdf8',
              letterSpacing: '0.8px',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          >
            SELECT TIME
          </div>

          {/* 3-Column Tumbler Layout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '2px 0'
            }}
          >
            {/* 1. Hours Column */}
            <div
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) handleHourUp();
                else handleHourDown();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                width: '36px'
              }}
            >
              {/* Up Arrow */}
              <button
                type="button"
                onClick={handleHourUp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronUp size={13} />
              </button>

              {/* Previous Hour */}
              <div
                onClick={() => handleSelectHour(prevHour)}
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '1px',
                  opacity: 0.45,
                  fontWeight: 600,
                  transition: 'opacity 0.15s ease'
                }}
              >
                {formatNumber(prevHour)}
              </div>

              {/* Active Hour */}
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px',
                  padding: '2px 4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '5px'
                }}
              >
                {formatNumber(parsed.hour12)}
              </div>

              {/* Next Hour */}
              <div
                onClick={() => handleSelectHour(nextHour)}
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '1px',
                  opacity: 0.45,
                  fontWeight: 600,
                  transition: 'opacity 0.15s ease'
                }}
              >
                {formatNumber(nextHour)}
              </div>

              {/* Down Arrow */}
              <button
                type="button"
                onClick={handleHourDown}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronDown size={13} />
              </button>
            </div>

            {/* Separator Colon */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#64748b',
                alignSelf: 'center',
                paddingBottom: '2px'
              }}
            >
              :
            </div>

            {/* 2. Minutes Column */}
            <div
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) handleMinuteUp();
                else handleMinuteDown();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                width: '36px'
              }}
            >
              {/* Up Arrow */}
              <button
                type="button"
                onClick={handleMinuteUp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronUp size={13} />
              </button>

              {/* Previous Minute */}
              <div
                onClick={() => handleSelectMinute(prevMinute)}
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '1px',
                  opacity: 0.45,
                  fontWeight: 600,
                  transition: 'opacity 0.15s ease'
                }}
              >
                {formatNumber(prevMinute)}
              </div>

              {/* Active Minute */}
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px',
                  padding: '2px 4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '5px'
                }}
              >
                {formatNumber(parsed.minute)}
              </div>

              {/* Next Minute */}
              <div
                onClick={() => handleSelectMinute(nextMinute)}
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '1px',
                  opacity: 0.45,
                  fontWeight: 600,
                  transition: 'opacity 0.15s ease'
                }}
              >
                {formatNumber(nextMinute)}
              </div>

              {/* Down Arrow */}
              <button
                type="button"
                onClick={handleMinuteDown}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronDown size={13} />
              </button>
            </div>

            {/* 3. AM / PM Column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                width: '38px',
                marginLeft: '4px'
              }}
            >
              {/* Up Arrow */}
              <button
                type="button"
                onClick={handleTogglePeriod}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronUp size={13} />
              </button>

              {/* AM Option */}
              <div
                onClick={() => parsed.period !== 'AM' && handleTogglePeriod()}
                style={{
                  fontSize: parsed.period === 'AM' ? '13px' : '11px',
                  fontWeight: parsed.period === 'AM' ? 800 : 500,
                  color: parsed.period === 'AM' ? '#38bdf8' : '#64748b',
                  cursor: 'pointer',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  backgroundColor: parsed.period === 'AM' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: parsed.period === 'AM' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                AM
              </div>

              {/* PM Option */}
              <div
                onClick={() => parsed.period !== 'PM' && handleTogglePeriod()}
                style={{
                  fontSize: parsed.period === 'PM' ? '13px' : '11px',
                  fontWeight: parsed.period === 'PM' ? 800 : 500,
                  color: parsed.period === 'PM' ? '#38bdf8' : '#64748b',
                  cursor: 'pointer',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  backgroundColor: parsed.period === 'PM' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: parsed.period === 'PM' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                PM
              </div>

              {/* Down Arrow */}
              <button
                type="button"
                onClick={handleTogglePeriod}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          {/* Full-width Done Button matching CRM primary theme (blue, not green) */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)'
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
