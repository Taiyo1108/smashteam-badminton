"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Award, Calendar, CheckCircle, Gift, AlertTriangle, ArrowLeft, Check } from "lucide-react";
import { API_URL } from "@/app/config";
import confetti from "canvas-confetti";

export default function AdminRedemptionsPage() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Trạng thái modal xác nhận trao quà
  const [selectedRedemption, setSelectedRedemption] = useState<any | null>(null);
  
  const [deliveringId, setDeliveringId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/shop/redemptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRedemptions(await res.json());
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Không thể tải danh sách đổi quà.");
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check query param coupon_code trên URL để tự mở modal xác thực nhanh
  useEffect(() => {
    if (typeof window !== "undefined" && redemptions.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const couponQuery = params.get("coupon_code");
      if (couponQuery) {
        // Khử dấu ngoặc vuông nếu người dùng copy thô URL mẫu [MÃ]
        const cleanCoupon = couponQuery.replace(/[\[\]]/g, "").trim();
        const matched = redemptions.find(r => r.coupon_code === cleanCoupon);
        if (matched) {
          setSelectedRedemption(matched);
        } else {
          setErrorMessage(`Không tìm thấy coupon chưa sử dụng hoặc đã được trao: ${cleanCoupon}`);
        }
      }
    }
  }, [redemptions]);

  const handleDeliver = async () => {
    if (!selectedRedemption) return;

    const { id, member_name, item_name } = selectedRedemption;
    setDeliveringId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/shop/redemptions/${id}/deliver`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "Đã xác nhận trao quà thành công!");
        
        // Bắn pháo hoa Confetti xanh lá báo thành công
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"]
        });

        setSelectedRedemption(null); // Đóng modal
        await fetchRedemptions(); // Tải lại danh sách
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(data.error || "Không thể xác nhận trao quà.");
      }
    } catch (e) {
      setErrorMessage("Lỗi kết nối.");
    } finally {
      setDeliveringId(null);
    }
  };



  // Lọc danh sách đổi quà theo ô tìm kiếm
  const filteredRedemptions = redemptions.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      r.member_name.toLowerCase().includes(query) ||
      r.coupon_code.toLowerCase().includes(query) ||
      r.item_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#06040d] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-950/20 via-[#06040d] to-[#030207] p-4 sm:p-8 text-slate-100">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại trang Admin
          </button>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide flex items-center gap-2.5">
            <Gift className="w-8 h-8 text-smash-violet animate-pulse" /> 
            Quản Lý Đổi Quà Vật Lý
          </h1>
          <p className="text-xs text-slate-400 mt-1">Xác nhận và trao quà tại sân cho các thành viên đã đổi xu.</p>
        </div>

        {/* Cụm chức năng tìm kiếm & Quét QR */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Thanh tìm kiếm nhanh */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã coupon, tên học viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950/80 border border-purple-950/40 rounded-xl focus:outline-none focus:border-smash-purple focus:ring-1 focus:ring-smash-purple transition-all text-white placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Thông báo thành công / thất bại */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-fade-in animate-pulse-slow">
            <CheckCircle className="w-5 h-5 shrink-0" /> {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Bảng danh sách quà đang chờ nhận */}
        <div className="rounded-2xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-smash-violet animate-spin" />
              <span className="text-xs text-slate-500 font-bold">Đang tải danh sách đổi quà...</span>
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Gift className="w-12 h-12 text-purple-950 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400">Không tìm thấy yêu cầu đổi quà nào</p>
              <p className="text-xs text-slate-500 mt-1">Danh sách hiện tại trống hoặc không khớp với nội dung tìm kiếm.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-purple-950/40 bg-slate-900/15 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-4 px-6">Hội viên</th>
                    <th className="py-4 px-6">Quà tặng</th>
                    <th className="py-4 px-6">Mã Coupon</th>
                    <th className="py-4 px-6">Ngày đổi</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/20 text-slate-200">
                  {filteredRedemptions.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-sm text-white">{row.member_name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-smash-purple/10 border border-smash-purple/20 flex items-center justify-center text-smash-violet">
                            <Award className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold text-slate-200">{row.item_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-black text-smash-violet bg-slate-950 px-2.5 py-1 rounded border border-purple-900/25 tracking-wider">
                          {row.coupon_code}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(row.acquired_at).toLocaleDateString("vi-VN", {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedRedemption(row)}
                          className="px-4 py-1.5 bg-gradient-to-r from-smash-purple to-smash-violet hover:from-smash-violet hover:to-smash-purple text-white text-xs font-black rounded-lg shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          Xác nhận trao quà
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pop-up Modal xác thực trao quà (Premium Custom Confirm Modal) */}
      {selectedRedemption && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="p-6 rounded-2xl bg-slate-950 border border-purple-500/40 max-w-sm w-full relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-smash-violet animate-pulse"></div>
            
            <div className="w-12 h-12 rounded-full bg-purple-950/40 text-smash-violet flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
              <Gift className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base font-black text-white text-center tracking-wide">Xác Nhận Trao Quà Vật Lý</h3>
            <p className="text-xs text-slate-400 text-center mt-1">Vui lòng đối chiếu kỹ sản phẩm trước khi xác nhận.</p>

            <div className="my-5 p-3.5 rounded-xl bg-slate-900/60 border border-purple-950/40 space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Hội viên:</span>
                <span className="font-bold text-white text-right">{selectedRedemption.member_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Quà tặng:</span>
                <span className="font-bold text-amber-400 text-right">{selectedRedemption.item_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Mã Coupon:</span>
                <span className="font-mono font-black text-smash-violet tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-purple-900/20">{selectedRedemption.coupon_code}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRedemption(null)}
                className="flex-1 py-2 text-xs font-black text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-lg cursor-pointer transition-colors border border-purple-950/30"
              >
                Hủy bỏ
              </button>
              
              <button
                onClick={handleDeliver}
                disabled={deliveringId === selectedRedemption.id}
                className="flex-1 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                {deliveringId === selectedRedemption.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Đồng ý trao
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
