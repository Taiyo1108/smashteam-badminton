"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, Plus, Edit, Trash2, Loader2, CheckCircle, 
  AlertTriangle, Search, ArrowLeft, History, Sparkles, Package,
  ArrowUp, ArrowDown, Award, Eye, EyeOff
} from "lucide-react";
import { API_URL } from "@/app/config";

export default function AdminShopPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"items" | "history">("items");
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

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

  // Common Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
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
        const res = await fetch(`${API_URL}/api/admin/shop-items`, { headers });
        if (res.ok) {
          setItems(await res.json());
        } else {
          setErrorMessage("Không thể tải danh sách sản phẩm.");
        }
      } else {
        const res = await fetch(`${API_URL}/api/admin/redemptions/history`, { headers });
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
        ? `${API_URL}/api/admin/shop-items/${editingItem.id}` 
        : `${API_URL}/api/admin/shop-items`;
        
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
      const res = await fetch(`${API_URL}/api/admin/shop-items/${itemId}`, {
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
      const res = await fetch(`${API_URL}/api/admin/shop-items/${itemId}`, {
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

  // Xóa sản phẩm an toàn
  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (!confirm(`Xác nhận xóa hoàn toàn sản phẩm "${itemName}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/api/admin/shop-items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || "Xóa sản phẩm thành công!");
        setItems(prev => prev.filter(item => item.id !== itemId));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || "Không thể xóa sản phẩm.");
      }
    } catch (err) {
      setErrorMessage("Lỗi kết nối.");
    }
  };

  // KPI Calculations
  const totalItemsCount = items.length;
  const lowStockCount = items.filter(item => item.item_type === "physical" && item.stock < 5).length;
  
  // Tổng lượt trao quà thành công hôm nay
  const today = new Date().toDateString();
  const deliveriesTodayCount = history.filter(
    h => h.status === "redeemed" && h.redeemed_at && new Date(h.redeemed_at).toDateString() === today
  ).length;

  // Lọc sản phẩm theo ô tìm kiếm
  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q)
    );
  });

  // Lọc lịch sử theo ô tìm kiếm
  const filteredHistory = history.filter(h => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      h.member_name.toLowerCase().includes(q) ||
      h.item_name.toLowerCase().includes(q) ||
      (h.coupon_code || "").toLowerCase().includes(q)
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
            <ShoppingBag className="w-8 h-8 text-smash-violet animate-pulse" /> 
            Quản Lý Gian Hàng
          </h1>
          <p className="text-xs text-slate-400 mt-1">Cấu hình gian hàng phần thưởng, điều chỉnh kho hàng và xem lịch sử giao dịch.</p>
        </div>

        {/* Cụm chức năng Tab, Tìm kiếm & Thêm mới */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Tabs */}
          <div className="flex bg-slate-950/80 border border-purple-950/40 p-1 rounded-xl w-full sm:w-auto shrink-0">
            <button
              onClick={() => {
                setActiveTab("items");
                setSearchQuery("");
              }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "items"
                  ? "bg-smash-purple text-white shadow-md shadow-smash-purple/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Gian hàng
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setSearchQuery("");
              }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-smash-purple text-white shadow-md shadow-smash-purple/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Lịch sử đối soát
            </button>
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === "items" ? "Tìm tên sản phẩm, phân loại..." : "Tìm hội viên, quà tặng..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950/80 border border-purple-950/40 rounded-xl focus:outline-none focus:border-smash-purple focus:ring-1 focus:ring-smash-purple transition-all text-white placeholder-slate-500"
            />
          </div>

          {/* Nút thêm sản phẩm mới (chỉ hiện ở tab gian hàng) */}
          {activeTab === "items" && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-smash-purple to-smash-violet hover:from-smash-violet hover:to-smash-purple text-white text-sm font-black rounded-xl shadow-lg active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Thêm sản phẩm
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Banner KPI (Chỉ hiện khi ở tab quản lý gian hàng để Admin dễ theo dõi nhanh) */}
        {activeTab === "items" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-950/40 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-950/30 text-smash-violet flex items-center justify-center font-bold text-xl">
                📦
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tổng số mặt hàng</span>
                <h3 className="text-xl font-black text-white mt-0.5">{totalItemsCount} món</h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-950/40 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-950/30 text-red-400 flex items-center justify-center font-bold text-xl animate-pulse-slow">
                ⚠️
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sắp cháy hàng (Stock &lt; 5)</span>
                <h3 className="text-xl font-black text-red-400 mt-0.5">{lowStockCount} sản phẩm</h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-950/40 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/30 text-emerald-400 flex items-center justify-center font-bold text-xl">
                🏆
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Giao dịch trong ngày</span>
                <h3 className="text-xl font-black text-emerald-400 mt-0.5">{deliveriesTodayCount} lượt</h3>
              </div>
            </div>
          </div>
        )}

        {/* Thông báo thành công / thất bại */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-5 h-5 shrink-0" /> {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {errorMessage}
          </div>
        )}

        {/* Loader chính */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-smash-violet animate-spin" />
            <span className="text-xs text-slate-500 font-bold">Đang tải dữ liệu...</span>
          </div>
        ) : activeTab === "items" ? (
          /* TAB 1: DANH SÁCH GIAN HÀNG */
          <div className="rounded-2xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 shadow-xl overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <ShoppingBag className="w-12 h-12 text-purple-950 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">Không tìm thấy sản phẩm nào</p>
                <p className="text-xs text-slate-500 mt-1">Gian hàng hiện tại trống hoặc không tìm thấy sản phẩm khớp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-950/40 bg-slate-900/15 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-4 px-6">Thông tin sản phẩm</th>
                      <th className="py-4 px-6">Cấu hình Game</th>
                      <th className="py-4 px-6">Tồn kho nhanh</th>
                      <th className="py-4 px-6">Trạng thái</th>
                      <th className="py-4 px-6 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/20 text-slate-200">
                    {filteredItems.map((item) => {
                      const isPhysical = item.item_type === "physical";
                      
                      // Rarity glow borders
                      let rarityBorder = "border-purple-950/30";
                      let rarityText = "text-slate-400";
                      if (item.rarity === "rare") {
                        rarityBorder = "border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.15)]";
                        rarityText = "text-blue-400";
                      } else if (item.rarity === "epic") {
                        rarityBorder = "border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]";
                        rarityText = "text-smash-violet";
                      } else if (item.rarity === "legendary") {
                        rarityBorder = "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]";
                        rarityText = "text-amber-400 font-extrabold";
                      }

                      return (
                        <tr key={item.id} className={`hover:bg-slate-900/10 transition-colors ${!item.is_active ? "opacity-60" : ""}`}>
                          {/* Thumbnail, Tên, Danh mục */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border bg-slate-900 flex items-center justify-center relative ${rarityBorder}`}>
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <Award className="w-5 h-5 text-smash-violet" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-white line-clamp-1">{item.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{item.category} • {isPhysical ? "Quà vật lý" : "Vật phẩm ảo"}</div>
                              </div>
                            </div>
                          </td>

                          {/* Giá, Cấp độ, Độ hiếm */}
                          <td className="py-4 px-6">
                            <div className="space-y-0.5">
                              <div className="text-xs font-black text-amber-400">{item.coin_price} 🪙</div>
                              <div className="text-[10px] text-slate-400">Yêu cầu Cấp: <strong className="text-slate-300">{item.level_required}</strong></div>
                              <div className={`text-[9px] uppercase font-black tracking-wider ${rarityText}`}>{item.rarity}</div>
                            </div>
                          </td>

                          {/* Fast Stock Edit Stepper */}
                          <td className="py-4 px-6">
                            {isPhysical ? (
                              <div className="flex items-center gap-2 bg-slate-950 w-24 px-1 py-0.5 rounded-lg border border-purple-900/25">
                                <button
                                  type="button"
                                  onClick={() => handleFastStockUpdate(item.id, item.stock, -1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs font-black text-slate-400 hover:text-white bg-slate-900 rounded cursor-pointer transition-colors active:scale-90"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center text-xs font-mono font-bold text-white">{item.stock}</span>
                                <button
                                  type="button"
                                  onClick={() => handleFastStockUpdate(item.id, item.stock, 1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs font-black text-slate-400 hover:text-white bg-slate-900 rounded cursor-pointer transition-colors active:scale-90"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Kích hoạt online</span>
                            )}
                          </td>

                          {/* Toggle Active status */}
                          <td className="py-4 px-6">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item.id, item.is_active)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                item.is_active
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                  : "bg-slate-900 text-slate-500 border border-slate-800"
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
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg bg-slate-900 border border-purple-950/40 text-slate-400 hover:text-white hover:border-smash-purple cursor-pointer transition-colors"
                                title="Sửa chi tiết"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white cursor-pointer transition-colors"
                                title="Xóa sản phẩm"
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
            )}
          </div>
        ) : (
          /* TAB 2: LỊCH SỬ ĐỐI SOÁT ĐỔI QUÀ */
          <div className="rounded-2xl bg-slate-950/80 backdrop-blur-md border border-purple-950/40 shadow-xl overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <History className="w-12 h-12 text-purple-950 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">Không tìm thấy lịch sử nào</p>
                <p className="text-xs text-slate-500 mt-1">Danh sách đối soát trống hoặc không tìm thấy bản ghi khớp.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-950/40 bg-slate-900/15 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-4 px-6">Học viên</th>
                      <th className="py-4 px-6">Vật phẩm đã đổi</th>
                      <th className="py-4 px-6">Mã Coupon</th>
                      <th className="py-4 px-6">Giá Coin</th>
                      <th className="py-4 px-6">Ngày đổi</th>
                      <th className="py-4 px-6">Ngày nhận quà</th>
                      <th className="py-4 px-6 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-950/20 text-slate-200">
                    {filteredHistory.map((row) => {
                      const isPhysical = row.item_type === "physical";
                      const isRedeemed = row.status === "redeemed";
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-900/10 transition-colors">
                          {/* Thành viên */}
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-bold text-sm text-white">{row.member_name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{row.member_phone}</div>
                            </div>
                          </td>

                          {/* Quà */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-smash-purple/10 border border-smash-purple/20 flex items-center justify-center text-smash-violet text-xs">
                                {isPhysical ? "🎁" : "👑"}
                              </div>
                              <span className="text-sm font-bold text-slate-200">{row.item_name}</span>
                            </div>
                          </td>

                          {/* Coupon Code */}
                          <td className="py-4 px-6">
                            {row.coupon_code ? (
                              <span className="font-mono text-xs font-black text-smash-violet bg-slate-950 px-2 py-0.5 rounded border border-purple-900/20 tracking-wider">
                                {row.coupon_code}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Tự kích hoạt</span>
                            )}
                          </td>

                          {/* Giá Xu */}
                          <td className="py-4 px-6">
                            <span className="text-xs font-black text-amber-400">{row.purchase_price || 0} 🪙</span>
                          </td>

                          {/* Ngày mua */}
                          <td className="py-4 px-6">
                            <div className="text-[10px] text-slate-400">
                              {new Date(row.purchased_at || row.acquired_at).toLocaleDateString("vi-VN", {
                                day: "numeric",
                                month: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                          </td>

                          {/* Ngày nhận quà */}
                          <td className="py-4 px-6">
                            {row.redeemed_at ? (
                              <div className="text-[10px] text-emerald-400 font-medium">
                                {new Date(row.redeemed_at).toLocaleDateString("vi-VN", {
                                  day: "numeric",
                                  month: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">—</span>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-4 px-6 text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${
                              isRedeemed 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                                : "bg-purple-500/10 text-smash-violet border-smash-purple/25 animate-pulse"
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
            )}
          </div>
        )}
      </div>

      {/* Modal Thêm / Sửa sản phẩm (Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="my-8 p-6 rounded-2xl bg-slate-950 border border-purple-500/40 max-w-lg w-full relative shadow-2xl flex flex-col gap-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-smash-purple to-smash-violet animate-pulse"></div>
            
            <h3 className="text-lg font-black text-white tracking-wide">
              {editingItem ? "Cập Nhật Sản Phẩm" : "Thêm Sản Phẩm Mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-300">
              {/* Tên sản phẩm */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple"
                  placeholder="Ví dụ: Cuốn cán vợt Yonex AC102EX"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Loại vật phẩm */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Loại sản phẩm</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple"
                  >
                    <option value="physical">Quà vật lý (Nhận tại sân)</option>
                    <option value="virtual">Vật phẩm ảo (Khung viền, danh hiệu...)</option>
                  </select>
                </div>

                {/* Danh mục */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Danh mục</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple"
                    placeholder="Ví dụ: Grip, Drink, Voucher..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Giá Coin */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Giá xu *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={coinPrice}
                    onChange={(e) => setCoinPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple font-mono"
                  />
                </div>

                {/* Tồn kho (Chỉ bắt buộc nếu là vật lý) */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {itemType === "physical" ? "Tồn kho *" : "Tồn kho (Ẩn)"}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={itemType !== "physical"}
                    value={itemType === "physical" ? stock : "999"}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple font-mono disabled:opacity-50"
                  />
                </div>

                {/* Cấp độ tối thiểu */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Cấp yêu cầu *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={levelRequired}
                    onChange={(e) => setLevelRequired(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Độ hiếm */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Độ hiếm</label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple"
                  >
                    <option value="common">Common (Thường - Xám)</option>
                    <option value="rare">Rare (Hiếm - Xanh)</option>
                    <option value="epic">Epic (Sử thi - Tím)</option>
                    <option value="legendary">Legendary (Huyền thoại - Vàng)</option>
                  </select>
                </div>

                {/* Trạng thái Bán ngay */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Trạng thái bán</label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center cursor-pointer gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-smash-purple bg-slate-900 border-purple-950/45 focus:ring-1 focus:ring-smash-purple outline-none cursor-pointer"
                      />
                      <span className="text-xs text-slate-300 font-bold">Kích hoạt bán ngay lập tức</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Mô tả sản phẩm */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Mô tả chi tiết</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-purple-950/40 rounded-xl text-white focus:outline-none focus:border-smash-purple h-20 resize-none"
                  placeholder="Nhập thông tin giới thiệu, các kích cỡ hoặc quy định nhận quà..."
                />
              </div>

              {/* Tải ảnh lên Cloudinary */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Hình ảnh sản phẩm</label>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-purple-950/40 overflow-hidden flex items-center justify-center shrink-0">
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
                      className="px-4 py-2 bg-slate-900 border border-purple-950/40 text-xs font-black text-slate-300 hover:text-white hover:border-smash-purple rounded-xl cursor-pointer inline-block transition-colors"
                    >
                      Chọn ảnh tải lên Cloudinary
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">Chấp nhận JPG, PNG, WEBP, tối đa 5MB. Ảnh sẽ được tự động crop tối ưu.</p>
                  </div>
                </div>
              </div>

              {/* Footer hành động */}
              <div className="flex gap-3 pt-4 border-t border-purple-950/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-black text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-xl cursor-pointer transition-colors border border-purple-950/30"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 text-xs font-black text-white bg-gradient-to-r from-smash-purple to-smash-violet hover:from-smash-violet hover:to-smash-purple rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
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
    </div>
  );
}
