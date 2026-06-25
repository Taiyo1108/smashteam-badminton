"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, MapPin, Users, Edit, Trash2, Power, PowerOff, Save, X } from "lucide-react";
import { format } from "date-fns";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Forms
  const [cForm, setCForm] = useState({ name: "", start: "", end: "", active: true });
  const [sForm, setSForm] = useState({ time: "", location: "", max: "20" });

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:5000/api/campaigns", { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setCampaigns(await res.json());
    } catch (e) {}
  };

  const fetchCampaignStats = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://localhost:5000/api/campaigns/${id}/stats`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setCampaignStats(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchCampaigns(); }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCampaignStats(selectedCampaign.id);
      // Fill edit form
      setCForm({
        name: selectedCampaign.name,
        start: new Date(selectedCampaign.start_date).toISOString().slice(0, 16),
        end: new Date(selectedCampaign.end_date).toISOString().slice(0, 16),
        active: selectedCampaign.is_active
      });
      setIsCreating(false);
    }
  }, [selectedCampaign]);

  const handleCreateOrUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");
      const url = selectedCampaign && !isCreating 
        ? `http://localhost:5000/api/campaigns/${selectedCampaign.id}` 
        : `http://localhost:5000/api/campaigns`;
      const method = selectedCampaign && !isCreating ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cForm.name,
          start_date: new Date(cForm.start).toISOString(),
          end_date: new Date(cForm.end).toISOString(),
          is_active: cForm.active
        })
      });
      if (res.ok) {
        alert("Lưu Đợt tuyển thành công!");
        setIsCreating(false);
        fetchCampaigns();
        if (selectedCampaign) fetchCampaignStats(selectedCampaign.id);
      }
    } catch (e) {}
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://localhost:5000/api/campaigns/${selectedCampaign.id}/slots`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          casting_time: new Date(sForm.time).toISOString(),
          location: sForm.location,
          max_capacity: parseInt(sForm.max)
        })
      });
      if (res.ok) {
        setSForm({ time: "", location: "", max: "20" });
        fetchCampaignStats(selectedCampaign.id);
      }
    } catch (e) {}
  };

  const handleToggleSlot = async (slot: any) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://localhost:5000/api/campaigns/slots/${slot.id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          casting_time: slot.casting_time,
          location: slot.location,
          max_capacity: slot.max_capacity,
          is_active: !slot.is_active
        })
      });
      if (res.ok) fetchCampaignStats(selectedCampaign.id);
    } catch (e) {}
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ca casting này không?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://localhost:5000/api/campaigns/slots/${slotId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCampaignStats(selectedCampaign.id);
      } else {
        const err = await res.json();
        alert(err.error || "Không thể xóa ca này.");
      }
    } catch (e) {
      alert("Lỗi kết nối mạng.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Đợt tuyển quân</h1>
          <p className="text-slate-500">Quản lý Master-Detail Đợt tuyển và Ca Casting.</p>
        </div>
        <button 
          onClick={() => { setIsCreating(true); setSelectedCampaign(null); setCForm({ name: "", start: "", end: "", active: true }); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-md"
        >
          <Plus className="w-5 h-5" /> Đợt mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cột trái: Danh sách Campaign */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-[calc(100vh-220px)] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-700 mb-4 sticky top-0 bg-white z-10 pb-2">Danh sách Đợt tuyển</h2>
            <div className="space-y-3">
              {campaigns.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCampaign(c)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCampaign?.id === c.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-secondary text-sm truncate pr-2">{c.name}</h3>
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${c.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`}></div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Mở: {format(new Date(c.start_date), "dd/MM/yyyy HH:mm")}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Đóng: {format(new Date(c.end_date), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải: Detail Dashboard */}
        <div className="lg:col-span-8">
          {(isCreating || selectedCampaign) ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
              
              {/* Form Sửa / Tạo Đợt Tuyển */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-secondary">{isCreating ? "Tạo đợt tuyển mới" : "Chỉnh sửa đợt tuyển"}</h2>
                  {selectedCampaign && !isCreating && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">ID: {selectedCampaign.id.split('-')[0]}</span>}
                </div>
                
                <form onSubmit={handleCreateOrUpdateCampaign} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tên chiến dịch</label>
                    <input type="text" required value={cForm.name} onChange={e => setCForm({...cForm, name: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian mở</label>
                    <input type="datetime-local" required value={cForm.start} onChange={e => setCForm({...cForm, start: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian đóng</label>
                    <input type="datetime-local" required value={cForm.end} onChange={e => setCForm({...cForm, end: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm" />
                  </div>
                  <div className="md:col-span-2 flex justify-between items-center mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={cForm.active} onChange={e => setCForm({...cForm, active: e.target.checked})} className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-slate-700">Kích hoạt (Hiển thị Form)</span>
                    </label>
                    <button type="submit" className="px-6 py-2 bg-secondary text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-900">
                      <Save className="w-4 h-4" /> Lưu thông tin
                    </button>
                  </div>
                </form>
              </div>

              {/* Thống kê & Quản lý Ca Casting (Chỉ hiện khi ĐANG CHỌN 1 đợt) */}
              {!isCreating && campaignStats && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl">
                      <p className="text-sm text-primary font-bold mb-1">Tổng đăng ký</p>
                      <p className="text-4xl font-black text-secondary">{campaignStats.total_registered}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-sm text-slate-500 font-bold mb-1">Số lượng Ca Casting</p>
                      <p className="text-4xl font-black text-secondary">{campaignStats.slots.length}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Quản lý Ca Casting</h3>
                    
                    {/* Form Thêm Ca */}
                    <form onSubmit={handleAddSlot} className="flex gap-2 mb-6">
                      <input type="datetime-local" required value={sForm.time} onChange={e => setSForm({...sForm, time: e.target.value})} className="flex-1 p-2.5 border rounded-lg text-sm" />
                      <input type="text" placeholder="Sân..." required value={sForm.location} onChange={e => setSForm({...sForm, location: e.target.value})} className="flex-1 p-2.5 border rounded-lg text-sm" />
                      <input type="number" placeholder="Max" min="1" required value={sForm.max} onChange={e => setSForm({...sForm, max: e.target.value})} className="w-24 p-2.5 border rounded-lg text-sm" />
                      <button type="submit" className="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg"><Plus className="w-5 h-5" /></button>
                    </form>

                    {/* Danh sách Ca */}
                    <div className="space-y-3">
                      {campaignStats.slots.map((slot: any) => {
                        const fillPercent = Math.min((parseInt(slot.registered_count) / slot.max_capacity) * 100, 100);
                        return (
                          <div key={slot.id} className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${!slot.is_active ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-secondary">{format(new Date(slot.casting_time), "HH:mm - dd/MM/yyyy")}</h4>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">{slot.location}</span>
                                {!slot.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Đã đóng</span>}
                              </div>
                              <div className="flex items-center gap-3 w-3/4">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${fillPercent >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${fillPercent}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{slot.registered_count} / {slot.max_capacity}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleToggleSlot(slot)} className={`p-2 rounded-lg transition-colors ${slot.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={slot.is_active ? "Đóng ca này" : "Mở lại ca này"}>
                                {slot.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDeleteSlot(slot.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa ca">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {campaignStats.slots.length === 0 && (
                        <p className="text-sm text-slate-500 italic text-center py-4">Chưa có ca casting nào được tạo.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 p-10 text-center">
              <div>
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Chọn một Đợt tuyển bên trái để xem thống kê chi tiết <br/> và quản lý Ca Casting.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
