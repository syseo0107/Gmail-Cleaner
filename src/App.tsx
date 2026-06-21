import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import {
  Mail,
  Trash2,
  LogOut,
  RefreshCw,
  SlidersHorizontal,
  Info,
  Sparkles,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Inbox,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn, logout } from "./lib/firebase";
import { GmailEmail, CategoryFilter } from "./types";
import GoogleSignInButton from "./components/GoogleSignInButton";
import EmailRow from "./components/EmailRow";
import BentoStats from "./components/BentoStats";
import ConfirmationModal from "./components/ConfirmationModal";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // App Logic States
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMailLoading, setIsMailLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [isTrashing, setIsTrashing] = useState(false);
  const [scanLimit, setScanLimit] = useState<number>(100);
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Custom Confirmation Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setToken(token);
        setNeedsAuth(false);
        setIsAuthLoading(false);
        // Automatically load emails when signed in
        loadAndAnalyzeEmails(token, scanLimit);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, [scanLimit]);

  // Handle manual login
  const handleLogin = async () => {
    setIsAuthLoading(true);
    setErrorMessage("");
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error("Login component error:", err);
      setErrorMessage("로그인 도중 문제가 발생했습니다. 브라우저 팝업 차단을 확인해보세요.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setEmails([]);
      setSelectedIds([]);
      setFilter("ALL");
    } catch (err) {
      console.error("Sign out fail:", err);
    }
  };

  // Main Email Fetch + Analysis Engine
  const loadAndAnalyzeEmails = async (curToken: string | null, limit: number) => {
    const activeToken = curToken || token;
    if (!activeToken) return;

    setIsMailLoading(true);
    setErrorMessage("");
    setEmails([]);
    setSelectedIds([]);

    try {
      setLoadingStep("1. Gmail 편지함에서 최신 메일을 가져오는 중...");
      // Fetch and analyze from backend server
      const response = await fetch(`/api/emails?maxResults=${limit}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 412 || response.status === 401) {
          // Token expired or invalid
          setNeedsAuth(true);
          return;
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `서버 오류 (${response.status})`);
      }

      setLoadingStep("2. Gemini AI가 불필요한 광고, 알림, 뉴스레터를 분석하는 중...");
      const data = (await response.json()) as { emails: GmailEmail[] };
      setEmails(data.emails);
      
      // Select all unnecessary emails by default to make trashing super easy
      const unnecessaryIds = data.emails
        .filter((email) => email.unnecessary)
        .map((email) => email.id);
      setSelectedIds(unnecessaryIds);

    } catch (err: any) {
      console.error("Fetch/Analysis failed:", err);
      setErrorMessage(
        err.message || 
        "메일을 분석하는 과정에서 에러가 발생했습니다. 잠시 후 다시 시도해보세요."
      );
    } finally {
      setIsMailLoading(false);
      setLoadingStep("");
    }
  };

  // Safe Batch Trashing logic
  const handleBatchTrash = async () => {
    if (selectedIds.length === 0 || !token) return;

    setIsTrashing(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/trash", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("메일 정리(휴지통 이동)에 실패했습니다.");
      }

      // Filter out deleted emails locally to avoid a complete slow re-fetch
      const remainingEmails = emails.filter((email) => !selectedIds.includes(email.id));
      setEmails(remainingEmails);
      setSelectedIds([]);
      
      // Display success confirmation logic safely
      alert(`성공적으로 ${selectedIds.length}개의 불필요한 메일이 휴지통으로 이동되었습니다!`);
    } catch (err: any) {
      console.error("Trashing error:", err);
      setErrorMessage(err.message || "휴지통으로 정리를 진행하는 도중 문제가 생겼습니다.");
    } finally {
      setIsTrashing(false);
    }
  };

  // Toggle selection for single item
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select state for all unnecessary emails
  const handleToggleSelectAll = () => {
    const unnecessaryEmails = emails.filter((e) => e.unnecessary);
    const unnecessaryIds = unnecessaryEmails.map((e) => e.id);
    
    const allSelected = unnecessaryIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      // Deselect all unnecessary
      setSelectedIds((prev) => prev.filter((id) => !unnecessaryIds.includes(id)));
    } else {
      // Select all unnecessary (merge without duplicates)
      setSelectedIds((prev) => Array.from(new Set([...prev, ...unnecessaryIds])));
    }
  };

  // Filter emails list for render
  const filteredEmails = emails.filter((email) => {
    if (filter === "ALL") return true;
    if (filter === "UNNECESSARY") return email.unnecessary;
    if (filter === "IMPORTANT") return !email.unnecessary;
    if (filter === "NEWSLETTER") return email.category.toLowerCase() === "newsletter";
    if (filter === "PROMOTION") return email.category.toLowerCase() === "promotion";
    if (filter === "NOTIFICATION") return email.category.toLowerCase() === "notification";
    return true;
  });

  const totalUnnecessary = emails.filter((e) => e.unnecessary).length;
  const unnecessarySelected = selectedIds.filter(id => {
    const found = emails.find(e => e.id === id);
    return found?.unnecessary;
  }).length;
  const isAllUnnecessarySelected = totalUnnecessary > 0 && unnecessarySelected === totalUnnecessary;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 antialiased font-sans flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-150 backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500 text-white rounded-xl shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                Gmail Cleaner
              </h1>
              <p className="text-[10px] text-gray-400 font-medium">Gemini 스마트 메일함 정우</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-xs font-semibold text-gray-800">
                    {user.displayName || "Gmail 사용자"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {user.email}
                  </span>
                </div>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Avatar"}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-gray-200"
                  />
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* 1. Unauthorized State / Landing Hero */}
          {needsAuth ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center justify-center py-12 sm:py-24 max-w-lg mx-auto text-center"
            >
              <div className="p-4 bg-red-50 text-red-500 rounded-3xl mb-6 shadow-sm">
                <Mail className="w-12 h-12" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-3">
                불필요한 이메일을<br/>
                <span className="text-red-600">Gemini AI</span>로 깨끗하게 비우세요.
              </h2>
              
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-md mb-8">
                일일이 분류하기 번거로웠던 대량의 광고, 스팸, 뉴스레터 메일들을 인공지능이 분석하여 지워도 안전한 메일만 선별해 드립니다.
              </p>

              {/* Step Info Checklist */}
              <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 text-left mb-8 space-y-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  이용 안내
                </h4>
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold font-mono">1</div>
                  <p className="text-xs text-gray-650 leading-relaxed">
                    <strong>구글 계정 연동</strong>: 이메일 정리를 위해 편지함을 읽고 수정(휴지통 이동)할 권한이 필요합니다.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold font-mono">2</div>
                  <p className="text-xs text-gray-650 leading-relaxed">
                    <strong>구글 Gemini 분석</strong>: 메일의 발신인, 제목, 요약 스니펫만 분석 정보로 송신되며, 비밀번호나 금융 기밀은 안전하게 보호됩니다.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold font-mono">3</div>
                  <p className="text-xs text-gray-650 leading-relaxed">
                    <strong>안전한 보관 보장</strong>: 메일을 곧바로 영구 삭제하지 않고 <strong>휴지통</strong>으로 안전하게 보내며, 리뷰하고 취소할 수 있는 기회를 드립니다.
                  </p>
                </div>
              </div>

              {isAuthLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  <span className="text-xs text-gray-400">보안 인증 연결 서비스 확인 중...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <GoogleSignInButton onClick={handleLogin} isLoading={isAuthLoading} />
                  {errorMessage && (
                    <p className="text-xs text-red-500 mt-2 bg-red-50/50 p-2.5 rounded-lg border border-red-100">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            
            // 2. Authorized Dashboard State
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Top Command Action bar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    스마트 인박스 메일 클리너
                  </h2>
                  <p className="text-xs text-gray-400">
                    불필요한 홍보물과 수신 알림 메일을 빠르게 정리하여 공간을 효율적으로 사용하세요.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Limit control query parameters */}
                  <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-semibold text-gray-500 px-2 uppercase">불러올 개수:</span>
                    {[100, 200, 500, 1000].map((num) => (
                      <button
                        key={num}
                        disabled={isMailLoading}
                        onClick={() => setScanLimit(num)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          scanLimit === num
                            ? "bg-white text-gray-900 shadow-xs"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {num}개
                      </button>
                    ))}
                  </div>

                  {/* Manual Reload refresh icon */}
                  <button
                    disabled={isMailLoading}
                    onClick={() => loadAndAnalyzeEmails(token, scanLimit)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isMailLoading ? "animate-spin" : ""}`} />
                    새로고침
                  </button>
                </div>
              </div>

              {/* Info or Dynamic Error banners */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold block mb-0.5">오류가 발생했습니다:</span>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Loading progress visualization */}
              {isMailLoading ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-red-500 animate-spin" />
                    <Sparkles className="w-4 h-4 text-amber-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <p className="text-sm font-bold text-gray-800">
                      인박스 스마트 분석 중...
                    </p>
                    <p className="text-xs text-gray-400 font-mono leading-relaxed">
                      {loadingStep}
                    </p>
                  </div>
                  <div className="w-full max-w-xs bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "10%" }}
                      animate={{ width: loadingStep.includes("1.") ? "45%" : "85%" }}
                      transition={{ duration: 1.5 }}
                      className="bg-red-500 h-full rounded-full"
                    />
                  </div>
                </div>
              ) : (
                emails.length > 0 && (
                  <>
                    {/* Bento visual stats */}
                    <BentoStats emails={emails} />

                    {/* Interactive controls and email row items */}
                    <div className="bg-white border border-gray-250 rounded-2xl overflow-hidden">
                      {/* Filter/Batch actions header */}
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Categories tags line */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 mr-2 uppercase tracking-wide">
                            필터링:
                          </span>
                          <button
                            onClick={() => setFilter("ALL")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              filter === "ALL"
                                ? "bg-gray-800 text-white"
                                : "text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            전체 메일 ({emails.length})
                          </button>
                          <button
                            onClick={() => setFilter("UNNECESSARY")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              filter === "UNNECESSARY"
                                ? "bg-red-500 text-white"
                                : "text-red-600 hover:bg-red-50/50"
                            }`}
                          >
                            정리 대상 ({totalUnnecessary})
                          </button>
                          <button
                            onClick={() => setFilter("IMPORTANT")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              filter === "IMPORTANT"
                                ? "bg-emerald-600 text-white"
                                : "text-emerald-700 hover:bg-emerald-50/50"
                            }`}
                          >
                            보관 대상 ({emails.length - totalUnnecessary})
                          </button>
                          <button
                            onClick={() => setFilter("NEWSLETTER")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              filter === "NEWSLETTER"
                                ? "bg-blue-600 text-white"
                                : "text-blue-600 hover:bg-blue-50/50"
                            }`}
                          >
                            뉴스레터
                          </button>
                          <button
                            onClick={() => setFilter("PROMOTION")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              filter === "PROMOTION"
                                ? "bg-purple-600 text-white"
                                : "text-purple-600 hover:bg-purple-50/50"
                            }`}
                          >
                            광고/홍보
                          </button>
                        </div>

                        {/* Batch Action Trash button */}
                        {totalUnnecessary > 0 && (
                          <div className="flex items-center gap-3 ml-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                            {/* Toggle select all checkbox */}
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAllUnnecessarySelected}
                                onChange={handleToggleSelectAll}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                              />
                              대상 전체 선택
                            </label>

                            <button
                              disabled={selectedIds.length === 0 || isTrashing}
                              onClick={() => setIsConfirmOpen(true)}
                              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-650 hover:bg-red-750 active:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              정리 대상 휴지통 이동 ({selectedIds.length})
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Emails Interactive List container */}
                      <div className="p-4 sm:p-6 max-h-[550px] overflow-y-auto">
                        <AnimatePresence initial={false}>
                          {filteredEmails.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="py-16 text-center space-y-3"
                            >
                              <div className="inline-flex p-3 bg-gray-100 text-gray-400 rounded-full">
                                <Inbox className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-semibold text-gray-500">
                                해당 필터 카테고리에 조건이 맞는 이메일이 존재하지 않습니다.
                              </p>
                              <p className="text-xs text-gray-400">
                                불러올 이메일 개수를 늘리거나 다른 필터를 선택해 필터링을 시도해보세요.
                              </p>
                            </motion.div>
                          ) : (
                            filteredEmails.map((email) => (
                              <EmailRow
                                key={email.id}
                                email={email}
                                isSelected={selectedIds.includes(email.id)}
                                onSelectToggle={handleSelectToggle}
                              />
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </>
                )
              )}

              {/* Empty initial state/Guide */}
              {!isMailLoading && emails.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
                  <div className="p-3 bg-red-50 text-red-500 inline-block rounded-full">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900">
                      인박스 스캔 준비 완료
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      현재 편지함 최신 메일을 읽어두지 않았습니다. 아래 버튼을 눌러 인공지능 정리를 시작해보세요.
                    </p>
                  </div>
                  <button
                    onClick={() => loadAndAnalyzeEmails(token, scanLimit)}
                    className="flex items-center gap-2 px-5 py-2.5 mx-auto text-xs font-semibold text-white bg-red-655 hover:bg-red-755 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    불필요한 이메일 스캔 시작하기
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation dialog overlays */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleBatchTrash}
        selectedCount={selectedIds.length}
      />

      {/* Footer bar */}
      <footer className="w-full bg-white border-t border-gray-150 py-4 mt-12 shrink-0">
        <div className="max-w-6xl mx-auto px-4 text-center text-[10px] text-gray-450 space-y-1">
          <p>© 2026 Gmail Cleaner. Powered by Gemini AI & Google Workspace APIs.</p>
          <p className="font-mono">Secure Sandboxed Operations • OAuth Token Session Caching only</p>
        </div>
      </footer>
    </div>
  );
}
