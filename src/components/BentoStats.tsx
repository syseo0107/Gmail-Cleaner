import React from "react";
import { Mail, CheckCircle2, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { GmailEmail } from "../types";

interface BentoStatsProps {
  emails: GmailEmail[];
}

export default function BentoStats({ emails }: BentoStatsProps) {
  const total = emails.length;
  const unnecessary = emails.filter((item) => item.unnecessary).length;
  const important = total - unnecessary;
  const cleanupPercent = total > 0 ? Math.round((unnecessary / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* 1. Unnecessary Count Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 bg-red-50/40 border border-red-100 rounded-2xl flex items-start gap-4"
      >
        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">
            정리 대상 메일 (비중)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{unnecessary}개</span>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-sm">
              {cleanupPercent}% 비중
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            광고, 홍보, 단순 알림메일 등
          </span>
        </div>
      </motion.div>

      {/* 2. Important / Safe Count Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-4 bg-emerald-50/35 border border-emerald-100 rounded-2xl flex items-start gap-4"
      >
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">
            보관 및 안전 메일
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{important}개</span>
            <span className="text-xs text-gray-400">/ {total}개</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">
            개인 및 업무 중요 메일, 필수 알림 등
          </span>
        </div>
      </motion.div>

      {/* 3. Progress / Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 bg-white border border-gray-200 rounded-2xl"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
          인박스 정리 추천도
        </span>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-2 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${cleanupPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-red-500 h-full rounded-full"
          />
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-400">정리 필요 없음</span>
          <span className="font-semibold text-red-600">
            {cleanupPercent >= 50
              ? "🚨 시급한 정리가 필요합니다!"
              : cleanupPercent > 0
                ? "💡 가벼운 청소를 추천합니다!"
                : "✨ 메일함 상태가 깨끗합니다!"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
