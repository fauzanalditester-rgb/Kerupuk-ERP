import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | 'full';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeClasses = {
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
    full: 'w-[98vw] md:w-[96vw] max-w-[1500px]'
  };

  const isFull = size === 'full';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${sizeClasses[size]} ${
              isFull ? 'h-[96vh] max-h-[96vh] flex flex-col' : 'w-full'
            } bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-200`}
          >
            <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate pr-2">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className={`p-2.5 sm:p-4 ${isFull ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : 'max-h-[80vh] overflow-y-auto'}`}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
