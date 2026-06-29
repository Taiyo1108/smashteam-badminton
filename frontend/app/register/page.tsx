"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, QrCode, Loader2, MapPin, Calendar, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { format } from "date-fns";
import { API_URL } from "@/app/config";

const levels = [
  { id: "Mới chơi", label: "Mới chơi", desc: "Chưa biết nhiều về kỹ thuật, muốn học hỏi thêm" },
  { id: "Trung bình", label: "Trung bình", desc: "Đã biết luật cơ bản, đánh phong trào" },
  { id: "Khá/Giỏi", label: "Khá/Giỏi", desc: "Kỹ thuật tốt, sẵn sàng thi đấu giải" }
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
      if (!formData.fullName || !formData.phoneZalo || !formData.gender) {
        alert("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Giới tính.");
        return;
      }
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(formData.phoneZalo)) {
        alert("Số điện thoại không đúng định dạng (phải có 10 chữ số và bắt đầu bằng số 0).");
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
      alert("Vui lòng chọn 1 ca Casting.");
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
          academic_info: `${formData.university} - ${formData.courseYear}`,
          badminton_level: formData.level,
          soft_skills: formData.selectedSkills,
          casting_slot_id: formData.selectedSlot,
          gender: formData.gender
        }),
      });

      if (!response.ok) throw new Error('Lỗi khi đăng ký');

      setIsSubmitting(false);
      setIsSuccess(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#eab308', '#ca8a04', '#1e293b', '#ffffff'] });
    } catch (error) {
      alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Navbar Minimal */}
      <nav className="absolute top-0 w-full z-50 p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-secondary">
          <ArrowLeft className="w-5 h-5" /> Trở về
        </Link>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 z-10 relative">
        {!isSuccess ? (
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 border border-slate-100 mt-16">
            {/* Progress Bar */}
            <div className="mb-12">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-slate-400">Bước {step}/3</span>
                <span className="text-sm font-bold text-primary">
                  {step === 1 ? "Thông tin cơ bản" : step === 2 ? "Học vấn" : "Chọn Ca Casting"}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Form Area */}
            <div className="min-h-[300px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <h2 className="text-3xl font-bold text-secondary mb-8">Thông tin của bạn</h2>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Họ và tên</label>
                      <input 
                        type="text" 
                        placeholder="Nguyễn Văn A"
                        className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800"
                        value={formData.fullName}
                        onChange={(e) => updateForm("fullName", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Số điện thoại (Zalo)</label>
                      <input 
                        type="tel" 
                        placeholder="09..."
                        className={`w-full px-5 py-4 rounded-xl border outline-none transition-all text-slate-800 ${
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
                      />
                      {phoneError && (
                        <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Giới tính</label>
                      <div className="flex gap-4">
                        {["Nam", "Nữ", "Khác"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateForm("gender", g)}
                            className={`flex-1 py-3.5 text-sm font-bold border-2 rounded-xl transition-all ${
                              formData.gender === g
                                ? "border-primary bg-primary/5 text-primary shadow-sm scale-[1.02]"
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
                    <h2 className="text-3xl font-bold text-secondary mb-8">Trường & Chuyên môn</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">Trường Đại học</label>
                        <input 
                          type="text" 
                          placeholder="VD: ĐH Bách Khoa"
                          className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800"
                          value={formData.university}
                          onChange={(e) => updateForm("university", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">Ngành / Khóa</label>
                        <input 
                          type="text" 
                          placeholder="VD: K64"
                          className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-800"
                          value={formData.courseYear}
                          onChange={(e) => updateForm("courseYear", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-4">Trình độ cầu lông của bạn?</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {levels.map((lvl) => (
                          <div 
                            key={lvl.id}
                            onClick={() => updateForm("level", lvl.id)}
                            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 ${formData.level === lvl.id ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                          >
                            <h3 className={`font-bold mb-1 text-sm ${formData.level === lvl.id ? 'text-primary' : 'text-secondary'}`}>{lvl.label}</h3>
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
                    className="space-y-8"
                  >
                    <h2 className="text-3xl font-bold text-secondary mb-2">Ca Casting & Kỹ năng</h2>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-4">Chọn 1 Ca Casting phù hợp với bạn <span className="text-red-500">*</span></label>
                      {isLoadingSlots ? (
                        <div className="flex justify-center p-6 text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>
                      ) : slots.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                          Hiện chưa có khung giờ Casting nào. Vui lòng quay lại sau hoặc liên hệ Fanpage.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {slots.map(slot => (
                            <div 
                              key={slot.id} 
                              onClick={() => slot.is_active && updateForm("selectedSlot", slot.id)}
                              className={`p-4 border-2 rounded-xl transition-all ${!slot.is_active ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' : formData.selectedSlot === slot.id ? 'bg-primary/5 border-primary shadow-sm cursor-pointer' : 'bg-white border-slate-100 hover:border-slate-300 cursor-pointer'}`}
                            >
                              <div className="font-bold text-secondary mb-2 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{format(new Date(slot.casting_time), "HH:mm")}</span>
                                  {!slot.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Đã đóng</span>}
                                </div>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{format(new Date(slot.casting_time), "dd/MM/yyyy")}</span>
                              </div>
                              <div className="text-sm text-slate-600 flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-primary/70" /> {slot.location}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-4">Bạn có thể hỗ trợ CLB các mảng nào? (Không bắt buộc)</label>
                      <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <button 
                            key={skill}
                            onClick={() => handleSkillToggle(skill)}
                            className={`px-4 py-2 text-sm font-bold border-2 rounded-full transition-all ${
                              formData.selectedSkills.includes(skill) 
                                ? 'bg-primary border-primary text-white shadow-md' 
                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
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
            <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-100">
              {step > 1 ? (
                <button 
                  onClick={prevStep}
                  className="px-6 py-3 rounded-full text-slate-500 hover:bg-slate-100 font-medium transition-colors"
                >
                  Quay lại
                </button>
              ) : <div></div>}

              {step < 3 ? (
                <button 
                  onClick={nextStep}
                  className="px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Tiếp tục <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.selectedSlot || isSubmitting}
                  className="px-8 py-3 bg-secondary hover:bg-slate-900 disabled:opacity-50 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  {isSubmitting ? "Đang xử lý..." : "Hoàn tất Đăng ký"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden mt-16"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-secondary mb-4">Chào mừng bạn!</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Hồ sơ của bạn đã được ghi nhận. Đừng quên đến tham gia Casting đúng theo khung giờ bạn đã chọn nhé!
            </p>
            
            <button onClick={() => window.location.href = "/"} className="block w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-colors shadow-lg">
              Quay lại Trang Chủ
            </button>
          </motion.div>
        )}
      </div>

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30rem] h-[30rem] bg-slate-200/50 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
