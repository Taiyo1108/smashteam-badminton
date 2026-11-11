"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check, User, ChevronDown } from "lucide-react";

export interface MemberItem {
  id: string;
  full_name: string;
  nickname?: string;
  phone_zalo?: string;
  avatar_url?: string;
  badminton_level?: string;
  role?: string;
  status?: string;
}

interface SearchableMemberSelectProps {
  members: MemberItem[];
  selectedMemberId: string;
  onSelectMember: (memberId: string, member?: MemberItem) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  excludeMemberIds?: string[] | Set<string>;
  helperText?: string;
  className?: string;
}

function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim();
}

function getLevelBadgeStyle(level?: string) {
  const norm = (level || "").toLowerCase();
  if (norm.includes("giỏi") || norm.includes("khá/giỏi")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (norm.includes("khá") || norm.includes("trung bình khá")) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  if (norm.includes("trung bình")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function SearchableMemberSelect({
  members = [],
  selectedMemberId,
  onSelectMember,
  label,
  placeholder = "Gõ tên, biệt danh hoặc SĐT để tìm...",
  required = false,
  disabled = false,
  excludeMemberIds,
  helperText,
  className = ""
}: SearchableMemberSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected member object
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  // Excluded ID Set
  const excludedSet = useMemo(() => {
    if (!excludeMemberIds) return new Set<string>();
    if (excludeMemberIds instanceof Set) return excludeMemberIds;
    return new Set(excludeMemberIds);
  }, [excludeMemberIds]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    const qNorm = removeVietnameseTones(searchQuery);
    return members.filter((m) => {
      if (excludedSet.has(m.id)) return false;
      if (!qNorm) return true;

      const nameNorm = removeVietnameseTones(m.full_name || "");
      const nickNorm = removeVietnameseTones(m.nickname || "");
      const phoneNorm = (m.phone_zalo || "").replace(/\s+/g, "");

      return (
        nameNorm.includes(qNorm) ||
        nickNorm.includes(qNorm) ||
        phoneNorm.includes(qNorm)
      );
    });
  }, [members, searchQuery, excludedSet]);

  // Reset highlighted index when filter results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredMembers.length]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSelect = (member: MemberItem) => {
    onSelectMember(member.id, member);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectMember("");
    setSearchQuery("");
    setTimeout(() => {
      inputRef.current?.focus();
      setIsOpen(true);
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredMembers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, filteredMembers.length - 1)
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredMembers[highlightedIndex]) {
        handleSelect(filteredMembers[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {selectedMember && !isOpen ? (
        // Hiển thị thẻ thành viên đã chọn
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary/50 transition-all shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedMember.avatar_url ? (
              <img
                src={selectedMember.avatar_url}
                alt={selectedMember.full_name}
                className="w-9 h-9 rounded-full object-cover border border-primary/40 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {selectedMember.full_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-secondary text-xs truncate">
                  {selectedMember.full_name}
                </span>
                {selectedMember.nickname && (
                  <span className="text-[10px] text-slate-500 font-medium truncate">
                    &bull; &ldquo;{selectedMember.nickname}&rdquo;
                  </span>
                )}
                {selectedMember.badminton_level && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getLevelBadgeStyle(
                      selectedMember.badminton_level
                    )}`}
                  >
                    {selectedMember.badminton_level}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                {selectedMember.phone_zalo || "Chưa có SĐT"}
              </p>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-2 shrink-0"
              title="Đổi thành viên khác"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        // Ô tìm kiếm dạng gõ
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              disabled={disabled}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {/* DROPDOWN DANH SÁCH GỢI Ý */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>
                  Tìm thấy <strong className="text-secondary">{filteredMembers.length}</strong> thành viên
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Dùng &uarr;&darr; và Enter để chọn
                </span>
              </div>

              <ul
                ref={listRef}
                className="max-h-56 sm:max-h-64 overflow-y-auto divide-y divide-slate-100/70 overscroll-contain"
              >
                {filteredMembers.length === 0 ? (
                  <li className="p-6 text-center text-xs text-slate-400">
                    <User className="w-6 h-6 mx-auto mb-1.5 text-slate-300 opacity-60" />
                    Không tìm thấy thành viên nào khớp với &ldquo;{searchQuery}&rdquo;
                  </li>
                ) : (
                  filteredMembers.map((m, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const isSelected = m.id === selectedMemberId;

                    return (
                      <li
                        key={m.id}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => handleSelect(m)}
                        className={`flex items-center justify-between p-2.5 sm:p-3 text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-secondary font-bold"
                            : isHighlighted
                            ? "bg-slate-100 text-slate-900"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] shrink-0 border border-slate-200">
                              {(m.full_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-secondary text-xs truncate">
                                {m.full_name}
                              </span>
                              {m.nickname && (
                                <span className="text-[11px] text-slate-500 font-medium truncate">
                                  &bull; &ldquo;{m.nickname}&rdquo;
                                </span>
                              )}
                              {m.badminton_level && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getLevelBadgeStyle(
                                    m.badminton_level
                                  )}`}
                                >
                                  {m.badminton_level}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              {m.phone_zalo || "Chưa có SĐT"}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0 ml-2">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}
