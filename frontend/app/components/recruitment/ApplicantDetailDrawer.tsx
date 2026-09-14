"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, User, Phone, Mail, GraduationCap, Trophy, 
  MapPin, Clock, Calendar, CheckCircle2, Trash2, 
  Copy, Check, Sparkles, Star 
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { CandidateItem } from "./RecruitmentKPIs";
import { parseAnswers, formatAnswer } from "./customQuestions";

interface ApplicantDetailDrawerProps {
  candidate: CandidateItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (candidate: CandidateItem) => void;
  onReject: (candidateId: string | number) => void;
}

export default function ApplicantDetailDrawer({
  candidate,
  isOpen,
  onClose,
  onApprove,
  onReject
}: ApplicantDetailDrawerProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!candidate) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const skillsList: string[] = Array.isArray(candidate.soft_skills)
    ? candidate.soft_skills
    : typeof candidate.soft_skills === "string"
    ? (() => {
        try {
          return JSON.parse(candidate.soft_skills);
        } catch {
          return candidate.soft_skills ? [candidate.soft_skills] : [];
        }
      })()
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/60 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-purple-100 text-foreground"
            >
              {/* Drawer Top Header */}
              <div className="bg-secondary p-6 text-white flex items-center justify-between border-b border-white/10 relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-white text-base">
                    {candidate.full_name ? candidate.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white leading-tight">
                      Hồ Sơ Ứng Viên
                    </h3>
                    <span className="text-xs text-purple-300 font-mono">
                      ID: #{String(candidate.id).slice(0, 8)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Đóng bảng chi tiết"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                
                {/* Candidate Overview Card */}
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-black text-secondary">
                      {candidate.full_name}
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-primary border border-primary/20 shadow-xs">
                      {candidate.badminton_level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>{candidate.academic_info || "Chưa cung cấp học vấn"}</span>
                  </p>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Thông Tin Liên Lạc
                  </h4>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-purple-600" /> SĐT Zalo
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-secondary">{candidate.phone_zalo}</span>
                        <button
                          onClick={() => copyToClipboard(candidate.phone_zalo)}
                          className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                          title="Sao chép SĐT"
                        >
                          {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-purple-600" /> Email
                      </span>
                      <span className="font-semibold text-secondary truncate max-w-[200px]">
                        {candidate.email || "Không có"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-600" /> Giới tính
                      </span>
                      <span className="font-bold text-secondary">
                        {candidate.gender || "Chưa xác định"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Casting Slot Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Lịch Casting Đã Chọn
                  </h4>
                  
                  {candidate.casting_time ? (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>{format(new Date(candidate.casting_time), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-amber-700">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{candidate.location || "Sân CLB"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      Ứng viên chưa chọn ca cố định (Cần liên hệ sắp xếp riêng).
                    </div>
                  )}
                </div>

                {/* Soft Skills */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Kỹ Năng Đăng Ký Hỗ Trợ
                  </h4>
                  {skillsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-50 text-primary border border-purple-200 rounded-full text-xs font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Không đăng ký kỹ năng hỗ trợ thêm.</p>
                  )}
                </div>

                {/* Custom Q&A Answers */}
                {(() => {
                  const qa = parseAnswers(candidate.extra_answers);
                  if (qa.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Trả lời câu hỏi bổ sung ({qa.length})
                      </h4>
                      <div className="space-y-2">
                        {qa.map((a, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                            <p className="text-[11px] font-bold text-slate-500 mb-1">
                              {idx + 1}. {a.question}
                            </p>
                            <p className="text-xs font-semibold text-secondary whitespace-pre-wrap">
                              {formatAnswer(a.answer)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Registration Timestamp */}
                {candidate.created_at && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Nộp đơn lúc: {format(new Date(candidate.created_at), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                )}

              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
                <button
                  type="button"
                  onClick={() => onApprove(candidate)}
                  className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-sm shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Duyệt Ứng Viên & Đánh Giá Điểm</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReject(candidate.id)}
                  className="w-full py-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Loại bỏ ứng viên này</span>
                </button>
              </div>

            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
