"use client";

import { Plus, Trash2, ChevronUp, ChevronDown, ListChecks } from "lucide-react";
import {
  CustomQuestion,
  NEEDS_OPTIONS,
  QUESTION_TYPE_LABELS,
  blankQuestion,
  type CustomQuestionType,
} from "./customQuestions";

interface CustomQuestionsEditorProps {
  value: CustomQuestion[];
  onChange: (next: CustomQuestion[]) => void;
}

export default function CustomQuestionsEditor({ value, onChange }: CustomQuestionsEditorProps) {
  const updateAt = (index: number, patch: Partial<CustomQuestion>) => {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addOption = (qIndex: number) => {
    const current = value[qIndex].options || [];
    updateAt(qIndex, { options: [...current, ""] });
  };

  const updateOption = (qIndex: number, optIndex: number, text: string) => {
    const nextOpts = [...(value[qIndex].options || [])];
    nextOpts[optIndex] = text;
    updateAt(qIndex, { options: nextOpts });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const nextOpts = (value[qIndex].options || []).filter((_, idx) => idx !== optIndex);
    updateAt(qIndex, { options: nextOpts });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-secondary flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-black" />
          Bộ câu hỏi tùy chỉnh
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-primary border border-purple-200">
            Sau bước 2
          </span>
        </h3>
        <span className="text-[11px] text-slate-400 font-semibold tabular-nums">
          {value.length} câu
        </span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Ứng viên sẽ trả lời bộ câu hỏi này ở bước mới ngay sau bước 2 (trước khi chọn ca casting).
        Bỏ trống nếu đợt này không cần hỏi thêm.
      </p>

      {value.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
          Chưa có câu hỏi nào. Nhấn “Thêm câu hỏi” để tạo câu đầu tiên.
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((q, i) => (
            <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Câu {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                    title="Chuyển lên trên"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === value.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                    title="Chuyển xuống dưới"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={q.label}
                onChange={(e) => updateAt(i, { label: e.target.value })}
                placeholder={`Ví dụ: Bạn có thể tham gia sinh hoạt cố định tối thứ 3 & 5 không?`}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-secondary placeholder:text-slate-400 placeholder:opacity-90 focus:outline-none focus:border-black"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as CustomQuestionType;
                    const defaultOpts = q.options && q.options.length > 0 ? q.options : ["", ""];
                    updateAt(i, {
                      type,
                      options: NEEDS_OPTIONS.includes(type) ? defaultOpts : [],
                    });
                  }}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-black cursor-pointer"
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as CustomQuestionType[]).map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateAt(i, { required: e.target.checked })}
                    className="w-4 h-4 text-black rounded border-slate-300"
                  />
                  Bắt buộc trả lời
                </label>
              </div>

              {NEEDS_OPTIONS.includes(q.type) && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-500">
                      Các lựa chọn trả lời ({(q.options || []).length} phương án)
                    </label>
                    <button
                      type="button"
                      onClick={() => addOption(i)}
                      className="text-[11px] font-bold text-primary hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm lựa chọn
                    </button>
                  </div>

                  <div className="space-y-2">
                    {((q.options && q.options.length > 0) ? q.options : ["", ""]).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-bold text-slate-400 select-none">
                          {optIdx + 1}.
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(i, optIdx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOption(i);
                            }
                          }}
                          placeholder={`Nhập phương án ${optIdx + 1}...`}
                          className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-secondary placeholder:text-slate-400 placeholder:opacity-90 focus:outline-none focus:border-black"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(i, optIdx)}
                          disabled={(q.options || []).length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-20 cursor-pointer"
                          title="Xóa phương án này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...value, blankQuestion()])}
        className="w-full py-2.5 border border-dashed border-slate-300 hover:border-black hover:bg-slate-50 text-slate-600 hover:text-black rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Thêm câu hỏi
      </button>
    </div>
  );
}
