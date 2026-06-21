import React from "react";
import { Check, Mail, AlertCircle, Info, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { GmailEmail } from "../types";

interface EmailRowProps {
  email: GmailEmail;
  isSelected: boolean;
  onSelectToggle: (id: string) => void;
  key?: string;
}

export default function EmailRow({ email, isSelected, onSelectToggle }: EmailRowProps) {
  // Translate categories to beautiful Korean labels
  const getCategoryBadge = (category: string) => {
    switch (category.toLowerCase()) {
      case "newsletter":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-100">뉴스레터</span>;
      case "promotion":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-purple-50 text-purple-600 border border-purple-100">광고/홍보</span>;
      case "social":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-pink-50 text-pink-600 border border-pink-100">소셜 소식</span>;
      case "notification":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-50 text-amber-600 border border-amber-100">알림/알림음</span>;
      case "important/personal":
      case "important":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">중요 메일</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-150">일반</span>;
    }
  };

  const formattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      layout
      className={`p-4 mb-3 border rounded-xl transition-all flex flex-col md:flex-row md:items-start gap-4 ${
        isSelected
          ? "border-red-200 bg-red-50/10 shadow-xs"
          : email.unnecessary
            ? "border-gray-200 bg-white hover:border-gray-300"
            : "border-gray-200 bg-gray-50/40 hover:border-gray-300"
      }`}
    >
      {/* Selection Control */}
      {email.unnecessary && (
        <div className="flex items-center justify-center md:pt-1">
          <input
            id={`checkbox-${email.id}`}
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectToggle(email.id)}
            className="w-5 h-5 text-red-650 bg-gray-100 border-gray-300 rounded-md focus:ring-red-500 cursor-pointer"
          />
        </div>
      )}

      {/* Main Grid: Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          {/* Status Badge */}
          {email.unnecessary ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-55 text-red-700 border border-red-100">
              <AlertTriangle className="w-3 h-3" />
              정리 대상 (불필요)
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-55 text-emerald-700 border border-emerald-100">
              <ShieldCheck className="w-3 h-3" />
              보관 추천 (중요)
            </div>
          )}

          {getCategoryBadge(email.category)}

          <span className="text-xs text-gray-400 font-mono ml-auto">
            {formattedDate(email.date)}
          </span>
        </div>

        {/* Sender & Subject */}
        <div className="mb-1">
          <span className="text-sm font-semibold text-gray-800 mr-2 truncate max-w-xs inline-block">
            {email.from.replace(/<.*>/, "").trim() || email.from}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {email.from.match(/<.*>/)?.[0] || ""}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">
          {email.subject || "(제목 없음)"}
        </h4>

        {/* Snippet Preview */}
        <p className="text-xs text-gray-550 leading-relaxed truncate mb-2.5">
          {email.snippet}
        </p>

        {/* Gemini AI Reason Insight */}
        <div className="p-2.5 rounded-lg bg-gray-55/5 border border-gray-50/80 text-xs flex gap-2 items-start">
          <div className="p-0.5 text-blue-500 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-gray-700 mr-1.5">[AI 분석]:</span>
            <span className="text-gray-650 font-normal leading-relaxed">{email.reason}</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-gray-400">추천 조치:</span>
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm">
                {email.cleanupActionSuggested}
              </span>
            </div>
          </div>
        </div>

        {/* Unsubscribe Quick Action link */}
        {email.unsubscribeUrl ? (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-250 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>본 메일의 헤더에서 안전한 <strong>원클릭 구독취소(Unsubscribe)</strong> 버튼이 제공됩니다.</span>
            </div>
            <a
              href={email.unsubscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-all text-[11px] shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title="원클릭 발급 구독 취소 외부 이동"
            >
              간편 구독 해제 ↗
            </a>
          </div>
        ) : (
          (email.category.toLowerCase() === "newsletter" || email.category.toLowerCase() === "promotion") && (
            <div className="mt-2.5 p-2 rounded bg-gray-50 text-[10px] text-gray-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>이 메일은 정기 소식 또는 광고 메일입니다. 메일 본문 하단의 <strong>수신거부(Unsubscribe)</strong> 메뉴를 클릭하여 추가 발송을 차단하실 수 있습니다.</span>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
