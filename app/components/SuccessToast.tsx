import React, { useEffect } from 'react';
import { CheckCircle, X } from 'react-feather';

interface SuccessToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function SuccessToast({ message, onClose, duration = 3000 }: SuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-green-200 p-4 flex items-center gap-3 min-w-[300px]">
        <CheckCircle className="text-green-500" size={24} />
        <p className="text-gray-900 flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}