import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-brand-dark/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div 
        className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors bg-slate-50 rounded-full p-2"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {/* Icon Alert - Orange Light Circle, Orange Icon */}
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-orange-200">
            <AlertTriangle className="w-10 h-10 text-[#FF8A00]" strokeWidth={2.5} />
          </div>

          {/* Title - Dark Blue */}
          <h3 className="text-2xl font-bold text-[#1e3a8a] mb-3">
            {title}
          </h3>

          {/* Message - Dark Gray */}
          <p className="text-slate-500 leading-relaxed font-medium text-base">
            {message}
          </p>

          {/* Action Buttons - Huge, Spacious, Brand Colors */}
          <div className="flex flex-col sm:flex-row gap-4 w-full mt-8">
            <button
              onClick={onClose}
              className="h-[60px] w-full flex items-center justify-center rounded-[20px] text-lg font-extrabold tracking-wide bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-[0.98]"
            >
              Annulla
            </button>
            <button
              onClick={onConfirm}
              className="h-[60px] w-full flex items-center justify-center rounded-[20px] text-lg font-extrabold tracking-wide bg-[#FF8A00] text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-[0.98]"
            >
              Conferma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};