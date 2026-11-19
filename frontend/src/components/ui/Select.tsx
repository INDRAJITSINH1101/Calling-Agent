import React from 'react';
import { FormSelect, FormSelectOption } from './FormSelect';

export type SelectOption = FormSelectOption;

export interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  label?: string;
  width?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  enableSearch?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  label,
  width = 'auto',
  placeholder,
  disabled,
  style,
  enableSearch = true
}) => {
  return (
    <FormSelect
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      width={width}
      fullWidth={false}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      enableSearch={enableSearch}
    />
  );
};

export default Select;
