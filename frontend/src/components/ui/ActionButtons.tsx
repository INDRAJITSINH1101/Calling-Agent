import React, { useState } from 'react';
import { PhoneCall, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'call' | 'edit' | 'delete' | 'default';
  icon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ActionButtonProps['variant']>, React.CSSProperties> = {
  call: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34d399'
  },
  edit: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1'
  },
  delete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#f87171'
  },
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1'
  }
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = 'default',
  icon,
  children,
  style,
  ...props
}) => {
  return (
    <button
      style={{
        padding: '6px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        ...variantStyles[variant],
        ...style
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

export interface TableActionButtonsProps {
  onCall?: () => void;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  callTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  callDisabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  // Confirm Delete Modal options
  requireDeleteConfirm?: boolean;
  itemName?: string;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
  deleteConfirmWarning?: string;
  extra?: React.ReactNode;
  style?: React.CSSProperties;
}

export const TableActionButtons: React.FC<TableActionButtonsProps> = ({
  onCall,
  onEdit,
  onDelete,
  callTitle = 'Trigger Voice AI Call',
  editTitle = 'Edit',
  deleteTitle = 'Delete',
  callDisabled = false,
  editDisabled = false,
  deleteDisabled = false,
  requireDeleteConfirm = true,
  itemName,
  deleteConfirmTitle = 'Confirm Deletion',
  deleteConfirmMessage,
  deleteConfirmWarning,
  extra,
  style
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    if (!onDelete) return;
    if (requireDeleteConfirm) {
      setIsConfirmOpen(true);
    } else {
      onDelete();
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete();
      setIsConfirmOpen(false);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          ...style
        }}
      >
        {onCall && !callDisabled && (
          <ActionButton
            variant="call"
            onClick={onCall}
            title={callTitle}
            icon={<PhoneCall size={14} />}
          />
        )}

        {onEdit && !editDisabled && (
          <ActionButton
            variant="edit"
            onClick={onEdit}
            title={editTitle}
            icon={<Pencil size={14} />}
          />
        )}

        {onDelete && !deleteDisabled && (
          <ActionButton
            variant="delete"
            onClick={handleDeleteClick}
            title={deleteTitle}
            icon={<Trash2 size={14} />}
          />
        )}

        {extra}
      </div>

      {onDelete && requireDeleteConfirm && (
        <ConfirmDeleteModal
          isOpen={isConfirmOpen}
          title={deleteConfirmTitle}
          itemName={itemName}
          message={deleteConfirmMessage}
          warningNote={deleteConfirmWarning}
          loading={isDeleting}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
};

export default TableActionButtons;

