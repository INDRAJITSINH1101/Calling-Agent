import React from 'react';

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const TableContainer: React.FC<TableContainerProps> = ({ children, style, ...props }) => (
  <div
    style={{
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      overflow: 'hidden',
      ...style
    }}
    {...props}
  >
    {children}
  </div>
);

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  align?: 'left' | 'center' | 'right';
}

export const Table: React.FC<TableProps> = ({ children, align = 'center', style, ...props }) => (
  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse',
      textAlign: align,
      ...style
    }}
    {...props}
  >
    {children}
  </table>
);

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, style, ...props }) => (
  <thead style={style} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, style, ...props }) => (
  <tbody style={style} {...props}>
    {children}
  </tbody>
);

export interface TableHeaderRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableHeaderRow: React.FC<TableHeaderRowProps> = ({ children, style, ...props }) => (
  <tr
    style={{
      backgroundColor: '#111827',
      borderBottom: '1px solid #1e293b',
      fontSize: '11px',
      textTransform: 'uppercase',
      color: '#94a3b8',
      letterSpacing: '0.05em',
      ...style
    }}
    {...props}
  >
    {children}
  </tr>
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  hoverable = true,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  return (
    <tr
      style={{
        borderBottom: '1px solid #1e293b',
        fontSize: '13px',
        color: '#f8fafc',
        transition: 'background-color 0.15s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        if (hoverable) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hoverable) e.currentTarget.style.backgroundColor = 'transparent';
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface TableHeadCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

export const TableHeadCell: React.FC<TableHeadCellProps> = ({
  children,
  align = 'center',
  style,
  ...props
}) => (
  <th
    style={{
      padding: '12px 16px',
      textAlign: align,
      fontWeight: 600,
      ...style
    }}
    {...props}
  >
    {children}
  </th>
);

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  align = 'center',
  style,
  ...props
}) => (
  <td
    style={{
      padding: '14px 16px',
      textAlign: align,
      ...style
    }}
    {...props}
  >
    {children}
  </td>
);

export const TableIdHeadCell: React.FC<TableHeadCellProps> = ({ children = 'ID', style, ...props }) => (
  <TableHeadCell align="center" style={{ width: '60px', minWidth: '50px', ...style }} {...props}>
    {children}
  </TableHeadCell>
);

export interface TableIdCellProps extends Omit<TableCellProps, 'id'> {
  id: number | string;
}

export const TableIdCell: React.FC<TableIdCellProps> = ({ id, style, ...props }) => (
  <TableCell align="center" style={{ width: '60px', minWidth: '50px', ...style }} {...props}>
    <span style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
      {id}
    </span>
  </TableCell>
);

export default Table;
