"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, MapPin, AlertCircle, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { format } from "date-fns";
import { API_URL } from "@/app/config";

const levels = [
  { id: "Mới chơi", label: "Mới chơi", desc: "Chưa biết nhiều về kỹ thuật, muốn học hỏi và giao lưu" },
  { id: "Trung bình", label: "Trung bình", desc: "Đã nắm vững luật cơ bản, đánh phong trào thường xuyên" },
  { id: "Khá/Giỏi", label: "Khá/Giỏi", desc: "Kỹ chiến thuật tốt, sẵn sàng thi đấu giải thăng hạng" }
];

const skills = [
  "Chụp ảnh", "Quay dựng video", "Thiết kế", "Hỗ trợ chạy giải"
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/campaigns/active`)
      .then(res => res.json())
      .then(data => {
        if (data && data.slots) setSlots(data.slots);
      })
      .finally(() => setIsLoadingSlots(false));
  }, []);

  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    phoneZalo: "",
    email: "",
    gender: "",
    university: "",
    courseYear: "",
    level: "",
    selectedSkills: [] as string[],
    selectedSlot: ""
  });

  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError("");
      return;
    }
    const hasNonDigits = /[^\d]/.test(value);
    if (hasNonDigits) {
      setPhoneError("Số điện thoại chỉ được chứa các chữ số (0-9).");
      return;
    }
    if (!value.startsWith("0")) {
      setPhoneError("Số điện thoại phải bắt đầu bằng chữ số 0.");
      return;
    }
    if (value.length !== 10) {
      setPhoneError(`Số điện thoại phải có đúng 10 chữ số (hiện tại: ${value.length} số).`);
      return;
    }
    setPhoneError("");
  };

  const updateForm = (field: string, value: any) => {
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

  const nextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.phoneZalo || !formData.gender || !formData.email) {
        alert("Vui lòng điền đầy đủ Họ tên, Số điện thoại, Email và Giới tính.");
        return;
      }
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(formData.phoneZalo)) {
        alert("Số điện thoại không đúng định dạng (phải có 10 chữ số và bắt đầu bằng số 0).");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        alert("Địa chỉ Email không đúng định dạng (Ví dụ: user@example.com).");
        return;
      }
    }
    if (step === 2 && (!formData.university || !formData.level)) {
      alert("Vui lòng chọn trường và trình độ.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!formData.selectedSlot) {
      alert("Vui lòng chọn 1 ca Casting phù hợp.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          phone_zalo: formData.phoneZalo,
          email: formData.email,
          academic_info: `${formData.university} - ${formData.courseYear}`,
          badminton_level: formData.level,
          soft_skills: formData.selectedSkills,
          casting_slot_id: formData.selectedSlot,
          gender: formData.gender
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi đăng ký');
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      confetti({ 
        particleCount: 160, 
        spread: 85, 
        origin: { y: 0.6 }, 
        colors: ['#7A22E0', '#9D4EDD', '#0C0A1A', '#ffffff'] 
      });
    } catch (error: any) {
      alert(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden text-foreground">
      {/* Navbar Minimal */}
      <header className="absolute top-0 w-full z-50 p-4 sm:p-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-2 font-bold text-xs sm:text-sm text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-full bg-white/80 border border-purple-100 backdrop-blur-md focus-ring cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Quay lại Trang chủ</span>
        </Link>
        <span className="font-black text-sm tracking-tight text-secondary">
          Smash<span className="text-primary">Team</span>
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center p-4 z-10 relative pt-20 sm:pt-24 pb-12">
        {!isSuccess ? (
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-6 sm:p-10 border border-purple-100">
            {/* Progress Bar */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước {step}/3</span>
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {step === 1 ? "1. Thông tin liên hệ" : step === 2 ? "2. Học vấn & Kỹ năng" : "3. Chọn Ca Casting"}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary to-smash-violet"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            {/* Form Steps */}
            <div className="min-h-[320px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-purple-50 px-2.5 py-0.5 rounded-full border border-primary/20 mb-2">
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Đơn Gia Nhập SmashTeam
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">Thông tin cá nhân</h1>
                    </div>

                    <div>
                      <label htmlFor="reg-fullname" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="reg-fullname"
                        type="text" 
                        placeholder="Nguyễn Văn A"
                        className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 text-sm"
                        value={formData.fullName}
                        onChange={(e) => updateForm("fullName", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Số điện thoại Zalo <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="reg-phone"
                        type="tel" 
                        placeholder="09..."
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl border outline-none transition-all text-slate-800 text-sm ${
                          phoneError 
                            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100" 
                            : "border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }`}
                        value={formData.phoneZalo}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateForm("phoneZalo", val);
                          validatePhone(val);
                        }}
                        required
                      />
                      {phoneError && (
                        <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Địa chỉ Email <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="reg-email"
                        type="email" 
                        placeholder="example@domain.com"
                        className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 text-sm"
                        value={formData.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Giới tính <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-3">
                        {["Nam", "Nữ", "Khác"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateForm("gender", g)}
                            className={`flex-1 min-h-[44px] py-2.5 text-xs sm:text-sm font-bold border-2 rounded-xl transition-all cursor-pointer focus-ring ${
                              formData.gender === g
                                ? "border-primary bg-purple-50 text-primary shadow-xs scale-[1.02]"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-purple-50 px-2.5 py-0.5 rounded-full border border-primary/20 mb-2">
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Bước 2 / 3
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">Trường & Trình độ</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="reg-uni" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Trường Đại học / Nơi học <span className="text-red-500">*</span>
                        </label>
                        <input 
                          id="reg-uni"
                          type="text" 
                          placeholder="VD: ĐH Bách Khoa, ĐH CNTT..."
                          className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 text-sm"
                          value={formData.university}
                          onChange={(e) => updateForm("university", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="reg-course" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Ngành / Khóa
                        </label>
                        <input 
                          id="reg-course"
                          type="text" 
                          placeholder="VD: K64, 2024..."
                          className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800 text-sm"
                          value={formData.courseYear}
                          onChange={(e) => updateForm("courseYear", e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Trình độ cầu lông của bạn? <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {levels.map((lvl) => (
                          <div 
                            key={lvl.id}
                            onClick={() => updateForm("level", lvl.id)}
                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 focus-ring ${
                              formData.level === lvl.id 
                                ? 'border-primary bg-purple-50/70 shadow-sm scale-[1.02]' 
                                : 'border-slate-200 hover:border-purple-200 bg-white'
                            }`}
                          >
                            <h3 className={`font-bold mb-1 text-sm ${formData.level === lvl.id ? 'text-primary' : 'text-secondary'}`}>
                              {lvl.label}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{lvl.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-purple-50 px-2.5 py-0.5 rounded-full border border-primary/20 mb-2">
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Bước 3 / 3
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">Ca Casting & Kỹ năng</h2>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Chọn 1 Ca Casting phù hợp <span className="text-red-500">*</span>
                      </label>
                      {isLoadingSlots ? (
                        <div className="flex justify-center p-8 text-primary">
                          <Loader2 className="animate-spin w-8 h-8" aria-hidden="true" />
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-purple-50/50 rounded-2xl border border-purple-100 text-sm">
                          Hiện chưa có khung giờ Casting khả dụng. Vui lòng quay lại sau hoặc liên hệ Fanpage SmashTeam.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {slots.map(slot => (
                            <div 
                              key={slot.id} 
                              onClick={() => slot.is_active && updateForm("selectedSlot", slot.id)}
                              className={`p-4 border-2 rounded-2xl transition-all focus-ring ${
                                !slot.is_active 
                                  ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                                  : formData.selectedSlot === slot.id 
                                    ? 'bg-purple-50/70 border-primary shadow-sm cursor-pointer scale-[1.02]' 
                                    : 'bg-white border-slate-200 hover:border-purple-200 cursor-pointer'
                              }`}
                            >
                              <div className="font-bold text-secondary mb-1.5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-black tabular-nums">{format(new Date(slot.casting_time), "HH:mm")}</span>
                                  {!slot.is_active && (
                                    <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Đã đóng</span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded tabular-nums">
                                  {format(new Date(slot.casting_time), "dd/MM/yyyy")}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                                <span>{slot.location}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Kỹ năng bổ trợ có thể đóng góp cho CLB (Không bắt buộc)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <button 
                            key={skill}
                            type="button"
                            onClick={() => handleSkillToggle(skill)}
                            className={`min-h-[40px] px-4 py-2 text-xs font-bold border-2 rounded-full transition-all cursor-pointer focus-ring ${
                              formData.selectedSkills.includes(skill) 
                                ? 'bg-primary border-primary text-white shadow-xs' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                            }`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-10 flex justify-between items-center pt-6 border-t border-purple-100">
              {step > 1 ? (
                <button 
                  onClick={prevStep}
                  className="min-h-[44px] px-6 py-2.5 rounded-full text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer focus-ring"
                >
                  Quay lại
                </button>
              ) : <div />}

              {step < 3 ? (
                <button 
                  onClick={nextStep}
                  className="min-h-[44px] px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md shadow-primary/25 active:scale-95 cursor-pointer focus-ring"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.selectedSlot || isSubmitting}
                  className="min-h-[44px] px-8 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-full font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md shadow-primary/30 active:scale-95 cursor-pointer focus-ring"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Hoàn tất Đăng ký</span>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden border border-purple-100"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-secondary mb-3">Chào mừng bạn!</h1>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Hồ sơ đăng ký của bạn đã được ghi nhận thành công. Vui lòng ghi nhớ lịch và có mặt đúng khung giờ Casting bạn đã chọn!
            </p>
            
            <Link href="/">
              <button className="min-h-[48px] w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-primary/30 active:scale-95 cursor-pointer focus-ring">
                Quay lại Trang Chủ
              </button>
            </Link>
          </motion.div>
        )}
      </main>

      {/* Subtle Background Radial Mesh */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-primary-hover/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
