import React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { animate, motion } from "motion/react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100"
      >
        {/* Header */}
        <div className="relative p-6 pb-2">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-150 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-full">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              이메일 정리 확인
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-650 leading-relaxed">
            선택하신 <strong className="text-red-600 font-semibold">{selectedCount}개</strong>의 불필요한 메일을 휴지통으로 이동하시겠습니까?
          </p>
          <div className="mt-3 p-3 rounded-lg bg-gray-50 text-xs text-gray-500 leading-snug">
            💡 휴지통으로 이동된 이메일은 Gmail 휴지통에서 30일 동안 보관된 후 영구 삭제되며, 원하시면 Gmail에서 복구하실 수 있습니다.
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            휴지통으로 이동
          </button>
        </div>
      </motion.div>
    </div>
  );
}
