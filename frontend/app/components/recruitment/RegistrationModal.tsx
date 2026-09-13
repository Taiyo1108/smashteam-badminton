"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ArrowRight, ArrowLeft, CheckCircle2, Loader2, 
  MapPin, AlertCircle, Sparkles, Trophy, Calendar, 
  Clock, Shield, User, Phone, Mail, GraduationCap, 
  Download, QrCode 
} from "lucide-react";
import confetti from "canvas-confetti";
import { format } from "date-fns";
import { API_URL } from "@/app/config";
import {
  parseQuestions,
  isAnswerEmpty,
  type CustomQuestion,
} from "./customQuestions";

export interface SlotData {
  id: string | number;
  casting_time: string;
  location: string;
  max_capacity: number;
  registered_count?: number;
  is_active?: boolean;
}

// Số chỗ đã nhận / sức chứa của 1 ca — ca hết slot khi đã nhận đủ sức chứa
const getSlotUsage = (s: SlotData) => {
  const capacity = Number(s.max_capacity) || 0;
  const registered = Number(s.registered_count) || 0;
  return { capacity, registered, isFull: capacity > 0 && registered >= capacity };
};

interface RegistrationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

const levels = [
  { 
    id: "Mới chơi", 
    label: "Mới chơi / Tân thủ", 
    stars: "⭐",
    desc: "Đang làm quen với kỹ thuật cơ bản, muốn học hỏi và giao lưu rèn luyện sức khỏe." 
  },
  { 
    id: "Trung bình", 
    label: "Trung bình phong trào", 
    stars: "⭐⭐⭐",
    desc: "Đã nắm vững luật, di chuyển cơ bản ổn, có thể phông, đập, gài lưới trong các trận đôi." 
  },
  { 
    id: "Khá/Giỏi", 
    label: "Khá / Bán chuyên", 
    stars: "⭐⭐⭐⭐⭐",
    desc: "Kỹ chiến thuật tốt, lực đập mạnh, bộ chân linh hoạt, sẵn sàng thi đấu giải thăng hạng ELO." 
  }
];

const availableSkills = [
  "Chụp ảnh & Truyền thông",
  "Quay dựng video / TikTok",
  "Thiết kế đồ họa",
  "Hỗ trợ trọng tài & Chạy giải"
];

export default function RegistrationModal({
  isOpen = true,
  onClose,
  isEmbedded = false
}: RegistrationModalProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(true);
  const [phoneError, setPhoneError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneZalo: "",
    email: "",
    gender: "Nam",
    university: "",
    courseYear: "",
    level: "Trung bình",
    selectedSkills: [] as string[],
    selectedSlot: ""
  });

  // Bộ câu hỏi tùy chỉnh do admin soạn cho đợt tuyển hiện tại (bước mới sau bước 2)
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const hasQuestions = customQuestions.length > 0;
  const totalSteps = hasQuestions ? 4 : 3;
  const isQuestionStep = hasQuestions && step === 3;
  const isSlotStep = step === totalSteps;

  const stepLabel =
    step === 1 ? "1. Thông tin cá nhân & Liên hệ" :
    step === 2 ? "2. Trình độ & Kỹ năng bổ trợ" :
    isQuestionStep ? "3. Câu hỏi bổ sung" :
    `${totalSteps}. Chọn Ca Casting & Xác nhận`;

  // Fetch active recruitment slots + custom questions
  useEffect(() => {
    fetch(`${API_URL}/api/campaigns/active`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.slots)) {
          const activeSlots = data.slots.filter((s: SlotData) => s.is_active !== false);
          setSlots(activeSlots);
          // Mặc định chọn ca còn chỗ đầu tiên, bỏ qua các ca đã hết slot
          if (activeSlots.length > 0 && !formData.selectedSlot) {
            const firstAvailable = activeSlots.find((s: SlotData) => !getSlotUsage(s).isFull) || null;
            if (firstAvailable) {
              setFormData(prev => ({ ...prev, selectedSlot: String(firstAvailable.id) }));
            }
          }
        }
        if (data) {
          setCustomQuestions(parseQuestions(data.custom_questions));
        }
      })
      .catch(e => console.error("Error fetching campaign slots:", e))
      .finally(() => setIsLoadingSlots(false));
  }, []);

  // Phone Validation
  const validatePhone = (value: string): boolean => {
    if (!value) {
      setPhoneError("Vui lòng nhập số điện thoại Zalo.");
      return false;
    }
    if (/[^\d]/.test(value)) {
      setPhoneError("Số điện thoại chỉ được chứa các chữ số.");
      return false;
    }
    if (!value.startsWith("0")) {
      setPhoneError("Số điện thoại phải bắt đầu bằng chữ số 0.");
      return false;
    }
    if (value.length !== 10) {
      setPhoneError(`Số điện thoại phải có đúng 10 chữ số (hiện tại: ${value.length} số).`);
      return false;
    }
    setPhoneError("");
    return true;
  };

  // Email Validation
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError("Vui lòng nhập địa chỉ Email nhận thông báo.");
      return false;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
      setEmailError("Địa chỉ Email không đúng định dạng (Ví dụ: name@example.com).");
      return false;
    }
    setEmailError("");
    return true;
  };

  const updateForm = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill]
    }));
  };

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckboxAnswer = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      return {
        ...prev,
        [questionId]: current.includes(option)
          ? current.filter(v => v !== option)
          : [...current, option]
      };
    });
  };

  const nextStep = () => {
    setSubmitError(null);
    if (step === 1) {
      if (!formData.fullName.trim()) {
        setSubmitError("Vui lòng nhập Họ và tên của bạn.");
        return;
      }
      const isPhoneValid = validatePhone(formData.phoneZalo);
      const isEmailValid = validateEmail(formData.email);
      if (!isPhoneValid || !isEmailValid) {
        return;
      }
    }
    if (step === 2) {
      if (!formData.university.trim()) {
        setSubmitError("Vui lòng nhập Trường hoặc Nghề nghiệp hiện tại.");
        return;
      }
      if (!formData.level) {
        setSubmitError("Vui lòng chọn trình độ cầu lông của bạn.");
        return;
      }
    }
    if (isQuestionStep) {
      const missing = customQuestions.find(q => q.required && isAnswerEmpty(answers[q.id]));
      if (missing) {
        setSubmitError(`Vui lòng trả lời câu hỏi bắt buộc: “${missing.label}”.`);
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setSubmitError(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Bắt buộc chọn ca casting ngay lúc đăng ký (không cho gửi đơn thiếu ca)
    if (isLoadingSlots) {
      setSubmitError("Đang tải lịch casting, vui lòng đợi giây lát.");
      return;
    }
    if (slots.length === 0) {
      setSubmitError("Hiện chưa mở ca casting nào. Bạn vui lòng quay lại đăng ký sau!");
      return;
    }
    if (!formData.selectedSlot) {
      setSubmitError("Vui lòng chọn một ca Casting phù hợp.");
      return;
    }
    // Chặn gửi đơn vào ca vừa hết slot (ca đầy lên sau khi tải form)
    const chosenSlot = slots.find(s => String(s.id) === String(formData.selectedSlot));
    if (chosenSlot && getSlotUsage(chosenSlot).isFull) {
      setSubmitError("Ca bạn chọn vừa hết chỗ. Vui lòng chọn ca khác còn trống.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.fullName.trim(),
          phone_zalo: formData.phoneZalo.trim(),
          email: formData.email.trim(),
          academic_info: `${formData.university.trim()}${formData.courseYear.trim() ? ` - ${formData.courseYear.trim()}` : ""}`,
          badminton_level: formData.level,
          soft_skills: formData.selectedSkills,
          casting_slot_id: formData.selectedSlot || null,
          gender: formData.gender,
          extra_answers: customQuestions.map(q => ({
            questionId: q.id,
            question: q.label,
            answer: answers[q.id] ?? (q.type === "checkbox" ? [] : "")
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi khi gửi hồ sơ đăng ký.");
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      confetti({ 
        particleCount: 160, 
        spread: 80, 
        origin: { y: 0.55 }, 
        colors: ["#7A22E0", "#9D4EDD", "#FFD700", "#38BDF8", "#ffffff"] 
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  const selectedSlotObj = slots.find(s => String(s.id) === String(formData.selectedSlot));

  const content = (
    <div className={`w-full ${isEmbedded ? "max-w-2xl mx-auto" : "max-w-2xl"} bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden text-foreground`}>
      
      {/* Modal Top Header */}
      <div className="bg-secondary px-6 sm:px-8 py-5 text-white flex items-center justify-between border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/30 border border-primary/50 flex items-center justify-center text-purple-200">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-black text-lg sm:text-xl tracking-tight text-white leading-tight">
              Đơn Ứng Tuyển Gia Nhập CLB
            </h3>
            <p className="text-xs text-purple-300 font-medium">
              SmashTeam Badminton Club • Mùa giải {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {!isEmbedded && onClose && (
          <button
            onClick={onClose}
            className="relative z-10 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8">
        
        {!isSuccess ? (
          <>
            {/* Step Progress Tracker */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="uppercase tracking-wider text-slate-400">
                  Bước {step} / {totalSteps}
                </span>
                <span className="text-primary font-black">
                  {stepLabel}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-smash-violet"
                  initial={{ width: `${(1 / totalSteps) * 100}%` }}
                  animate={{ width: `${(step / totalSteps) * 100}%` }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn An"
                      value={formData.fullName}
                      onChange={e => updateForm("fullName", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Số điện thoại Zalo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="0912345678"
                        maxLength={10}
                        value={formData.phoneZalo}
                        onChange={e => {
                          updateForm("phoneZalo", e.target.value);
                          validatePhone(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all font-mono"
                        required
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Giới tính <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Nam", "Nữ"].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateForm("gender", g)}
                          className={`min-h-[46px] py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                            formData.gender === g
                              ? "bg-purple-50 text-primary border-primary shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Địa chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="ban@example.com (để nhận kết quả & thông báo)"
                      value={formData.email}
                      onChange={e => {
                        updateForm("email", e.target.value);
                        validateEmail(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                  {emailError && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">{emailError}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Badminton Level & Skills */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Trường / Nơi công tác <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ví dụ: ĐH CNTT (UIT), ĐH Bách Khoa, Đi làm..."
                      value={formData.university}
                      onChange={e => updateForm("university", e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Level Selection Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Trình độ cầu lông tự đánh giá <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2.5">
                    {levels.map(lvl => {
                      const isSelected = formData.level === lvl.id;
                      return (
                        <div
                          key={lvl.id}
                          onClick={() => updateForm("level", lvl.id)}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-purple-50/70 border-primary shadow-sm"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-secondary">{lvl.label}</span>
                              <span className="text-xs">{lvl.stars}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{lvl.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Soft Skills Checkboxes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Kỹ năng có thể hỗ trợ CLB (Tùy chọn)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSkills.map(skill => {
                      const checked = formData.selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => handleSkillToggle(skill)}
                          className={`p-3 rounded-2xl border text-xs font-semibold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            checked
                              ? "bg-purple-50 text-primary border-primary font-bold shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            checked ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"
                          }`}>
                            {checked && <span className="text-[10px]">✓</span>}
                          </div>
                          <span>{skill}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step mới: Câu hỏi bổ sung do admin soạn (sau bước 2) */}
            {isQuestionStep && (
              <motion.div
                key="step-questions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-slate-600 leading-relaxed">
                  Ban chủ nhiệm muốn hiểu thêm về bạn trước buổi casting. Vui lòng trả lời các câu hỏi dưới đây.
                </div>
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {customQuestions.map((q, idx) => {
                    const value = answers[q.id] ?? (q.type === "checkbox" ? [] : "");
                    return (
                      <div key={q.id}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                          {idx + 1}. {q.label} {q.required && <span className="text-rose-500">*</span>}
                        </label>
                        {q.type === "text" && (
                          <input
                            type="text"
                            value={value as string}
                            onChange={e => setAnswer(q.id, e.target.value)}
                            placeholder="Nhập câu trả lời của bạn..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all"
                          />
                        )}
                        {q.type === "textarea" && (
                          <textarea
                            rows={3}
                            value={value as string}
                            onChange={e => setAnswer(q.id, e.target.value)}
                            placeholder="Chia sẻ chi tiết hơn..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all resize-y"
                          />
                        )}
                        {q.type === "select" && (
                          <select
                            value={value as string}
                            onChange={e => setAnswer(q.id, e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-secondary focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
                          >
                            <option value="">— Chọn một đáp án —</option>
                            {q.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {q.type === "radio" && (
                          <div className="space-y-2">
                            {q.options.map(opt => {
                              const selected = value === opt;
                              return (
                                <div
                                  key={opt}
                                  onClick={() => setAnswer(q.id, opt)}
                                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    selected
                                      ? "bg-purple-50/70 border-primary shadow-sm"
                                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <span className="text-xs sm:text-sm font-semibold text-secondary">{opt}</span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                                  }`}>
                                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.type === "checkbox" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map(opt => {
                              const checked = Array.isArray(value) && (value as string[]).includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleCheckboxAnswer(q.id, opt)}
                                  className={`p-3 rounded-2xl border text-xs font-semibold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                    checked
                                      ? "bg-purple-50 text-primary border-primary font-bold shadow-xs"
                                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                    checked ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"
                                  }`}>
                                    {checked && <span className="text-[10px]">✓</span>}
                                  </div>
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step cuối: Slot Selection & Confirm */}
            {isSlotStep && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Chọn Ca Thử Sân (Casting Slot) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-purple-600 font-bold">
                      {slots.filter(s => !getSlotUsage(s).isFull).length}/{slots.length} ca còn chỗ
                    </span>
                  </div>

                  {isLoadingSlots ? (
                    <div className="p-8 text-center text-primary flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-bold">Đang tải lịch casting...</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold">
                      Hiện chưa mở ca casting nào. Bạn vui lòng quay lại đăng ký sau khi CLB mở đợt mới!
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                      {slots.map(s => {
                        const isSelected = String(formData.selectedSlot) === String(s.id);
                        const dateFormatted = format(new Date(s.casting_time), "dd/MM/yyyy HH:mm");
                        const { capacity, registered, isFull } = getSlotUsage(s);
                        return (
                          <div
                            key={s.id}
                            onClick={() => { if (!isFull) updateForm("selectedSlot", String(s.id)); }}
                            aria-disabled={isFull}
                            className={`relative overflow-hidden p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                              isFull
                                ? "bg-slate-100 border-slate-200 opacity-70 cursor-not-allowed"
                                : isSelected
                                  ? "bg-purple-50/70 border-primary shadow-sm cursor-pointer"
                                  : "bg-slate-50 border-slate-200 hover:border-slate-300 cursor-pointer"
                            }`}
                          >
                            <div className={`space-y-1 ${isFull ? "grayscale" : ""}`}>
                              <div className="flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${isFull ? "text-slate-400" : "text-primary"}`} />
                                <span className="text-xs sm:text-sm font-bold text-secondary capitalize">
                                  {dateFormatted}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{s.location}</span>
                              </div>
                              <p className={`text-[11px] font-bold ${isFull ? "text-rose-600" : "text-emerald-600"}`}>
                                {isFull
                                  ? `Đã đủ ${registered}/${capacity} — hết chỗ`
                                  : `Còn ${Math.max(0, capacity - registered)}/${capacity} chỗ`}
                              </p>
                            </div>

                            {isFull ? (
                              <span className="shrink-0 rotate-[-8deg] px-3 py-1 rounded-lg border-[3px] double border-rose-600 text-rose-600 text-xs font-black uppercase tracking-widest bg-rose-50/80 shadow-sm select-none">
                                Hết slot
                              </span>
                            ) : (
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Review Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-secondary text-xs uppercase tracking-wider">
                    Kiểm tra lại thông tin:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <p>Ứng viên: <strong className="text-secondary">{formData.fullName}</strong></p>
                    <p>Zalo: <strong className="text-secondary font-mono">{formData.phoneZalo}</strong></p>
                    <p>Trình độ: <strong className="text-secondary">{formData.level}</strong></p>
                    <p>Giới tính: <strong className="text-secondary">{formData.gender}</strong></p>
                  </div>
                  {hasQuestions && (
                    <p className="pt-1 text-slate-500">
                      Đã trả lời: <strong className="text-secondary">
                        {customQuestions.filter(q => !isAnswerEmpty(answers[q.id])).length}/{customQuestions.length} câu hỏi bổ sung
                      </strong>
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Bottom Actions Buttons */}
            <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="min-h-[46px] px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-ring"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại</span>
                </button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="min-h-[46px] px-7 py-2.5 bg-secondary hover:bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer focus-ring shadow-md"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="min-h-[46px] px-8 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs sm:text-sm font-black rounded-full shadow-lg shadow-primary/30 transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer focus-ring"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi hồ sơ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Xác Nhận Nộp Đơn</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        ) : (
          /* Success Application Ticket Pass */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border-2 border-emerald-200 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-primary">
                Ứng Tuyển Thành Công
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-secondary">
                Chào Mừng Bạn Đến Với SmashTeam!
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
                Hồ sơ ứng tuyển của bạn đã được ghi nhận vào hệ thống. Ban tổ chức sẽ liên hệ qua số Zalo <strong>{formData.phoneZalo}</strong> trước ngày casting.
              </p>
            </div>

            {/* Ticket Pass View */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-[#120e26] to-secondary text-white rounded-3xl p-6 border border-primary/40 shadow-xl relative overflow-hidden text-left space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-black text-xs">
                    S
                  </div>
                  <span className="font-bold text-sm tracking-tight text-white">SmashTeam Casting Pass</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ĐÃ XÁC NHẬN
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Họ và tên ứng viên</p>
                  <p className="text-base font-black text-white">{formData.fullName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Trình độ</p>
                    <p className="font-bold text-purple-200">{formData.level}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Số điện thoại Zalo</p>
                    <p className="font-bold text-slate-200 font-mono">{formData.phoneZalo}</p>
                  </div>
                </div>

                {selectedSlotObj && (
                  <div className="pt-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Ca Thử Sân Đã Chọn</p>
                    <p className="font-bold text-emerald-300">
                      {format(new Date(selectedSlotObj.casting_time), "dd/MM/yyyy HH:mm")} ({selectedSlotObj.location})
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>Vui lòng mang theo vợt & giày cầu lông</span>
                <QrCode className="w-5 h-5 text-purple-300" />
              </div>
            </div>

            {/* Action close */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  else window.location.href = "/";
                }}
                className="min-h-[46px] px-8 py-2.5 bg-secondary hover:bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer focus-ring"
              >
                Hoàn tất & Về trang chủ
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-2xl my-6"
          >
            {content}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
