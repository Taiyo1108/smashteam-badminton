"use client";

import { useState, useEffect, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ShoppingBag, Plus, Edit, Trash2, Loader2, CheckCircle, 
  AlertTriangle, Search, ArrowLeft, History, Sparkles, Package,
  Award, Eye, EyeOff, Check, Gift, Calendar
} from "lucide-react";
import { API_URL } from "@/app/config";
import { Modal, PillButton } from "@/app/components/ui";

export default function AdminShopPage() {
  const router = useRouter();
  // 3 Tabs: "items" (Gian hàng), "redemptions" (Duyệt đổi quà), "history" (Lịch sử đối soát)
  const [activeTab, setActiveTab] = useState<"items" | "redemptions" | "history">("items");
  
  const [items, setItems] = useState<any[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Custom Confirmation Modal for delivering
  const [selectedRedemption, setSelectedRedemption] = useState<any | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<"physical" | "virtual">("physical");
  const [coinPrice, setCoinPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Đồ dùng");
  const [description, setDescription] = useState("");
  const [levelRequired, setLevelRequired] = useState("1");
  const [rarity, setRarity] = useState<"common" | "rare" | "epic" | "legendary">("common");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deliveringId, setDeliveringId] = useState<number | null>(null);

  const [pendingCoupon, setPendingCoupon] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === "items") {
        const res = await fetch(`${API_URL}/api/shop/admin/shop-items`, { headers });
        if (res.ok) {
          setItems(await res.json());
        } else {
          setErrorMessage("Không thể tải danh sách sản phẩm.");
        }
      } else if (activeTab === "redemptions") {
        const res = await fetch(`${API_URL}/api/shop/redemptions`, { headers });
        if (res.ok) {
          setPendingRedemptions(await res.json());
        } else {
          setErrorMessage("Không thể tải danh sách chờ trao quà.");
        }
      } else {
        const res = await fetch(`${API_URL}/api/shop/admin/redemptions/history`, { headers });
        if (res.ok) {
          setHistory(await res.json());
        } else {
          setErrorMessage("Không thể tải lịch sử đối soát đổi quà.");
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  // Parse ?tab=&coupon_code= 1 lần khi mount — dùng chung fetchData, không fetch riêng lần 2
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabQuery = params.get("tab");
      const couponQuery = params.get("coupon_code");

      if (couponQuery) {
        setPendingCoupon(couponQuery.replace(/[\[\]]/g, "").trim());
        setActiveTab("redemptions");
      } else if (tabQuery === "redemptions") {
        setActiveTab("redemptions");
        router.replace("/admin/shop");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi danh sách redemptions tải xong và có coupon chờ → tự mở modal xác nhận
  useEffect(() => {
    if (!pendingCoupon || activeTab !== "redemptions" || isLoading) return;
    const matched = pendingRedemptions.find((r: any) => r.coupon_code === pendingCoupon);
    if (matched) {
      setSelectedRedemption(matched);
    } else {
      setErrorMessage(`Không tìm thấy coupon chưa sử dụng hoặc đã được trao: ${pendingCoupon}`);
    }
    setPendingCoupon(null);
    // Xóa tham số khỏi thanh địa chỉ tránh reload lặp lại
    router.replace("/admin/shop");
  }, [pendingCoupon, pendingRedemptions, activeTab, isLoading, router]);

  // Mở modal thêm sản phẩm
  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setItemType("physical");
    setCoinPrice("0");
    setStock("0");
    setCategory("Đồ dùng");
    setDescription("");
    setLevelRequired("1");
    setRarity("common");
    setIsActive(true);
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // Mở modal sửa sản phẩm
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setItemType(item.item_type);
    setCoinPrice(item.coin_price.toString());
    setStock(item.stock.toString());
    setCategory(item.category || "Đồ dùng");
    setDescription(item.description || "");
    setLevelRequired(item.level_required.toString());
    setRarity(item.rarity || "common");
    setIsActive(item.is_active);
    setImageFile(null);
    setImagePreview(item.image_url);
    setIsModalOpen(true);
  };

  // Xử lý đổi file ảnh
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Submit Form thêm/sửa sản phẩm
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("name", name);
      formData.append("item_type", itemType);
      formData.append("coin_price", coinPrice);
      formData.append("stock", stock);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("level_required", levelRequired);
      formData.append("rarity", rarity);
      formData.append("is_active", isActive.toString());
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = editingItem 
        ? `${API_URL}/api/shop/admin/shop-items/${editingItem.id}` 
        : `${API_URL}/api/shop/admin/shop-items`;
        
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(data.message || "Lưu sản phẩm thành công!");
        setIsModalOpen(false);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || "Có lỗi xảy ra khi lưu sản phẩm.");
      }
    } catch (err) {
      setErrorMessage("Lỗi kết nối.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cập nhật nhanh tồn kho (Fast Stock Edit: Stepper)
  const handleFastStockUpdate = async (itemId: number, currentStock: number, change: number) => {
    const newStock = Math.max(0, currentStock + change);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/shop/admin/shop-items/${itemId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ stock: newStock })
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, stock: newStock } : item));
      }
    } catch (err) {
      console.error("Fast stock update failed:", err);
    }
  };

  // Cập nhật nhanh trạng thái Bán/Ẩn (Toggle is_active)
  const handleToggleActive = async (itemId: number, currentActive: boolean) => {
    const newActive = !currentActive;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/shop/admin/shop-items/${itemId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ is_active: newActive })
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, is_active: newActive } : item));
        setSuccessMessage(`Đã ${newActive ? "mở bán" : "tạm ẩn"} sản phẩm thành công!`);
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (err) {
      console.error("Toggle active status failed:", err);
    }
  };

  // Xóa sản phẩm an toàn (xác nhận qua modal, không dùng confirm())
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    setIsDeletingItem(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/shop/admin/shop-items/${deletingItem.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "Xóa sản phẩm thành công!");
        setItems(prev => prev.filter(item => item.id !== deletingItem.id));
        setDeletingItem(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || "Không thể xóa sản phẩm.");
        setDeletingItem(null);
      }
    } catch (err) {
      setErrorMessage("Lỗi kết nối.");
      setDeletingItem(null);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Xác nhận trao quà cho thành viên (Modal duyệt đổi quà)
  const handleDeliver = async () => {
    if (!selectedRedemption) return;

    const { id, item_name } = selectedRedemption;
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
        
        // Confetti màu xanh lá ăn mừng (lazy-load để nhẹ trang)
        const { default: confetti } = await import("canvas-confetti");
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#a7f3d0", "#ffffff"]
        });

        setSelectedRedemption(null);
        await fetchData(); // Tải lại danh sách
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

  // Lọc tìm kiếm (deferred để không filter mỗi phím gõ)
  const deferredQuery = useDeferredValue(searchQuery);
  const filteredItems = items.filter(item => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q)
    );
  });

  const filteredRedemptions = pendingRedemptions.filter(r => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.member_name.toLowerCase().includes(q) ||
      r.item_name.toLowerCase().includes(q) ||
      (r.coupon_code || "").toLowerCase().includes(q)
    );
  });

  const filteredHistory = history.filter(h => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      h.member_name.toLowerCase().includes(q) ||
      h.item_name.toLowerCase().includes(q) ||
      (h.coupon_code || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Title & Topbar */}
      {/* Title & Topbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-black" />
            Quản Lý Gian Hàng & Đổi Quà
          </h1>
          <p className="text-slate-500 text-sm mt-1">Cấu hình sản phẩm, duyệt trao quà vật lý cho học viên và xem lịch sử đối soát hàng hóa.</p>
        </div>
      </div>

      {/* Toolbar: Tabs on left, Search + Add Button on right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60">
        {/* 3 Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl w-full lg:w-auto shrink-0">
          <button
            onClick={() => {
              setActiveTab("items");
              setSearchQuery("");
              setErrorMessage(null);
            }}
            className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "items"
                ? "bg-black text-secondary shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Sản phẩm
          </button>
          <button
            onClick={() => {
              setActiveTab("redemptions");
              setSearchQuery("");
              setErrorMessage(null);
            }}
            className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "redemptions"
                ? "bg-black text-secondary shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Gift className="w-3.5 h-3.5" /> Duyệt đổi quà
            {pendingRedemptions.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                {pendingRedemptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setSearchQuery("");
              setErrorMessage(null);
            }}
            className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "bg-black text-secondary shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Lịch sử đối soát
          </button>
        </div>

        {/* Search & Add button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Ô tìm kiếm */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          {/* Nút thêm sản phẩm mới (chỉ hiện ở tab gian hàng) */}
          {activeTab === "items" && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-black hover:bg-black/85 text-secondary text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      {/* Thông báo */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle className="w-5 h-5 shrink-0" /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2 animate-fade-in font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {errorMessage}
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-black" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          
          {/* TAB 1: DANH SÁCH GIAN HÀNG */}
          {activeTab === "items" && (
            filteredItems.length === 0 ? (
              <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl m-4">
                <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-500">Cửa hàng trống</p>
                <p className="text-xs text-slate-400 mt-1">Chưa có sản phẩm nào được thiết lập hoặc bộ lọc không khớp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">Thông tin quà tặng</th>
                      <th className="p-4">Cấu hình Game</th>
                      <th className="p-4">Tồn kho nhanh</th>
                      <th className="p-4">Trạng thái bán</th>
                      <th className="p-4 pr-6 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredItems.map((item) => {
                      const isPhysical = item.item_type === "physical";
                      
                      // Rarity styling
                      let rarityText = "text-slate-400";
                      let rarityBadge = "bg-slate-100 text-slate-500 border-slate-200";
                      if (item.rarity === "rare") {
                        rarityText = "text-blue-500";
                        rarityBadge = "bg-blue-50 text-blue-600 border-blue-100";
                      } else if (item.rarity === "epic") {
                        rarityText = "text-purple-500";
                        rarityBadge = "bg-purple-50 text-purple-600 border-purple-100";
                      } else if (item.rarity === "legendary") {
                        rarityText = "text-amber-600 font-bold";
                        rarityBadge = "bg-amber-50 text-amber-600 border-amber-200";
                      }

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${!item.is_active ? "opacity-60" : ""}`}>
                          {/* Thumbnail & Tên */}
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center relative">
                                {item.image_url ? (
                                  <Image src={item.image_url} alt={item.name} fill sizes="40px" loading="lazy" unoptimized className="object-cover" />
                                ) : (
                                  <Award className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-secondary">{item.name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{item.category} • {isPhysical ? "Quà vật lý" : "Vật phẩm ảo"}</div>
                              </div>
                            </div>
                          </td>

                          {/* Coins & Game Config */}
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <div className="text-xs font-black text-amber-500 tabular-nums">+{item.coin_price} Xu</div>
                              <div className="text-[10px] text-slate-500">Yêu cầu Cấp: <strong className="text-slate-700">{item.level_required}</strong></div>
                              <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${rarityBadge}`}>
                                {item.rarity}
                              </span>
                            </div>
                          </td>

                          {/* Stock Stepper */}
                          <td className="p-4">
                            {isPhysical ? (
                              <div className="flex items-center gap-1.5 bg-slate-50 w-24 px-1 py-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleFastStockUpdate(item.id, item.stock, -1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded cursor-pointer active:scale-90 transition-transform"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center text-xs tabular-nums font-bold text-slate-700">{item.stock}</span>
                                <button
                                  type="button"
                                  onClick={() => handleFastStockUpdate(item.id, item.stock, 1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded cursor-pointer active:scale-90 transition-transform"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Online Auto</span>
                            )}
                          </td>

                          {/* Active Toggle Switch */}
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id, item.is_active)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                item.is_active
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {item.is_active ? (
                                <>
                                  <Eye className="w-3 h-3" /> Đang Bán
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Đang Ẩn
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Sửa"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingItem(item)}
                                className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 2: DUYỆT ĐỔI QUÀ (Thay cho trang /admin/redemptions) */}
          {activeTab === "redemptions" && (
            filteredRedemptions.length === 0 ? (
              <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl m-4">
                <Gift className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-500">Không có yêu cầu chờ nhận quà</p>
                <p className="text-xs text-slate-400 mt-1">Danh sách chờ trống hoặc bộ lọc không khớp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">Hội viên</th>
                      <th className="p-4">Quà tặng</th>
                      <th className="p-4">Mã Coupon</th>
                      <th className="p-4">Ngày đổi xu</th>
                      <th className="p-4 pr-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredRedemptions.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-secondary">{row.member_name}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-700">{row.item_name}</span>
                        </td>
                        <td className="p-4">
                          <span className="tabular-nums text-xs font-black text-black bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded tracking-wider">
                            {row.coupon_code}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(row.acquired_at).toLocaleDateString("vi-VN", {
                              day: "numeric",
                              month: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedRedemption(row)}
                            className="px-4 py-1.5 bg-black text-secondary hover:bg-black/85 text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            Xác nhận trao quà
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 3: LỊCH SỬ ĐỐI SOÁT */}
          {activeTab === "history" && (
            filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-3xl m-4">
                <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-500">Chưa có lịch sử đổi quà</p>
                <p className="text-xs text-slate-400 mt-1">Danh sách đối soát trống hoặc bộ lọc không khớp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">Thành viên</th>
                      <th className="p-4">Mặt hàng</th>
                      <th className="p-4">Mã Coupon</th>
                      <th className="p-4">Giá đổi xu</th>
                      <th className="p-4">Ngày đổi</th>
                      <th className="p-4">Ngày nhận quà</th>
                      <th className="p-4 pr-6 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredHistory.map((row) => {
                      const isPhysical = row.item_type === "physical";
                      const isRedeemed = row.status === "redeemed";
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Học viên */}
                          <td className="p-4 pl-6">
                            <div>
                              <div className="font-bold text-secondary">{row.member_name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{row.member_phone}</div>
                            </div>
                          </td>

                          {/* Quà */}
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{isPhysical ? "🎁" : "👑"}</span>
                              <span className="font-bold text-slate-700">{row.item_name}</span>
                            </div>
                          </td>

                          {/* Coupon Code */}
                          <td className="p-4">
                            {row.coupon_code ? (
                              <span className="tabular-nums text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {row.coupon_code}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Auto Online</span>
                            )}
                          </td>

                          {/* Giá Coin */}
                          <td className="p-4">
                            <span className="font-bold text-amber-500 tabular-nums">{row.purchase_price || 0} Xu</span>
                          </td>

                          {/* Ngày đổi */}
                          <td className="p-4">
                            <div className="text-xs text-slate-500">
                              {new Date(row.purchased_at || row.acquired_at).toLocaleDateString("vi-VN", {
                                day: "numeric",
                                month: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                          </td>

                          {/* Ngày nhận */}
                          <td className="p-4">
                            {row.redeemed_at ? (
                              <div className="text-xs text-emerald-600 font-medium">
                                {new Date(row.redeemed_at).toLocaleDateString("vi-VN", {
                                  day: "numeric",
                                  month: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="p-4 pr-6 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wider ${
                              isRedeemed 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : "bg-purple-50 text-purple-600 border-purple-100 animate-pulse"
                            }`}>
                              {isRedeemed ? "Đã nhận" : "Chưa nhận"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

        </div>
      )}

      {/* Modal Thêm / Sửa sản phẩm (Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="my-8 p-6 rounded-3xl bg-white border border-slate-200 max-w-lg w-full relative shadow-xl flex flex-col gap-4 text-slate-800">
            <h3 className="text-lg font-black text-secondary tracking-tight">
              {editingItem ? "Cập Nhật Sản Phẩm" : "Thêm Sản Phẩm Mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Tên sản phẩm */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black"
                  placeholder="Ví dụ: Cuốn cán vợt Yonex AC102EX"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Loại vật phẩm */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Loại sản phẩm</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black"
                  >
                    <option value="physical">Quà vật lý (Nhận tại sân)</option>
                    <option value="virtual">Vật phẩm ảo (Khung viền, danh hiệu...)</option>
                  </select>
                </div>

                {/* Danh mục */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Danh mục</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black"
                    placeholder="Ví dụ: Grip, Drink, Voucher..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Giá Coin */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Giá xu *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={coinPrice}
                    onChange={(e) => setCoinPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black tabular-nums"
                  />
                </div>

                {/* Tồn kho */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {itemType === "physical" ? "Tồn kho *" : "Tồn kho (Ẩn)"}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={itemType !== "physical"}
                    value={itemType === "physical" ? stock : "999"}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black tabular-nums disabled:opacity-50"
                  />
                </div>

                {/* Cấp độ tối thiểu */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cấp yêu cầu *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={levelRequired}
                    onChange={(e) => setLevelRequired(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Độ hiếm */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Độ hiếm</label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black"
                  >
                    <option value="common">Common (Thường - Xám)</option>
                    <option value="rare">Rare (Hiếm - Xanh)</option>
                    <option value="epic">Epic (Sử thi - Tím)</option>
                    <option value="legendary">Legendary (Huyền thoại - Vàng)</option>
                  </select>
                </div>

                {/* Trạng thái Bán ngay */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Trạng thái bán</label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center cursor-pointer gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-black bg-slate-50 border-slate-200 focus:ring-1 focus:ring-black outline-none cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 font-bold">Kích hoạt bán ngay lập tức</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Mô tả sản phẩm */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Mô tả chi tiết</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-black h-20 resize-none"
                  placeholder="Nhập thông tin giới thiệu, các kích cỡ hoặc quy định nhận quà..."
                />
              </div>

              {/* Tải ảnh lên Cloudinary */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Hình ảnh sản phẩm</label>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">📷</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="shop-image-upload"
                    />
                    <label
                      htmlFor="shop-image-upload"
                      className="px-4 py-2 bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-800 hover:border-slate-300 rounded-xl cursor-pointer inline-block transition-all"
                    >
                      Chọn ảnh tải lên Cloudinary
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">Chấp nhận JPG, PNG, WEBP, tối đa 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Footer hành động */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 text-xs font-bold text-secondary bg-black hover:bg-black/85 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>Lưu sản phẩm</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Modal xác thực trao quà (Deliver Confirm Modal) */}
      <Modal
        open={!!selectedRedemption}
        onClose={() => setSelectedRedemption(null)}
        title="Xác Nhận Trao Quà"
        maxWidth="max-w-sm"
      >
        {selectedRedemption && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Gift className="w-6 h-6" />
            </div>

            <p className="text-xs text-slate-500 text-center mt-1">Vui lòng đối chiếu sản phẩm trước khi phát quà.</p>

            <div className="my-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Hội viên:</span>
                <span className="font-bold text-right">{selectedRedemption.member_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Quà tặng:</span>
                <span className="font-bold text-amber-600 text-right">{selectedRedemption.item_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">Mã Coupon:</span>
                <span className="tabular-nums font-black bg-white px-2 py-0.5 rounded border border-slate-200">{selectedRedemption.coupon_code}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <PillButton variant="ghost" onClick={() => setSelectedRedemption(null)} className="flex-1">
                Hủy bỏ
              </PillButton>

              <PillButton
                variant="black"
                onClick={handleDeliver}
                loading={deliveringId === selectedRedemption.id}
                className="flex-1"
              >
                <Check className="w-3.5 h-3.5" /> Đồng ý trao
              </PillButton>
            </div>
          </>
        )}
      </Modal>

      {/* DELETE ITEM CONFIRM MODAL */}
      <Modal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Xóa sản phẩm?"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Xác nhận xóa hoàn toàn sản phẩm <strong>“{deletingItem?.name}”</strong>? Thao tác này không thể hoàn tác.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <PillButton variant="ghost" onClick={() => setDeletingItem(null)}>
            Hủy
          </PillButton>
          <PillButton variant="danger" loading={isDeletingItem} onClick={handleDeleteItem}>
            Xóa sản phẩm
          </PillButton>
        </div>
      </Modal>

    </div>
  );
}
