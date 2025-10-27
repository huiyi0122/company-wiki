import React from "react";
import "../styles/Modal.css";

interface ModalProps {
    isOpen: boolean;
    title?: string;
    onClose: () => void;
    onConfirm?: () => void;
    children?: React.ReactNode;
    confirmText?: string;
}

export default function Modal({
    isOpen,
    title,
    onClose,
    onConfirm,
    children,
    confirmText = "Confirm",
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {title && <h3>{title}</h3>}
                <div className="modal-body">{children}</div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    {onConfirm && (
                        <button className="btn-confirm" onClick={onConfirm}>
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}