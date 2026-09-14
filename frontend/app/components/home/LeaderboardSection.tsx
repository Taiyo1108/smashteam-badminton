"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Check, Trophy } from "lucide-react";
import { API_URL } from "@/app/config";
import { getRankBadgeClass, type LeaderboardPlayer } from "./rank-utils";

type Props = {
  initialSingles: LeaderboardPlayer[];
  initialDoubles: LeaderboardPlayer[];
};

type BoardType = "singles" | "doubles";

function LeaderboardSection({ initialSingles, initialDoubles }: Props) {
  const [type, setType] = useState<BoardType>("singles");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [cache, setCache] = useState<Record<BoardType, LeaderboardPlayer[]>>({
    singles: initialSingles,
    doubles: initialDoubles,
  });
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Chỉ refetch khi user đổi tab và dữ liệu server đã cũ (>60s).
  // Dùng initial data từ SSR nên lần đầu không cần fetch -> FCP nhanh hơn.
  useEffect(() => {
    // Nếu đã có dữ liệu SSR thì bỏ qua fetch đầu tiên cho tab mặc định
    if (type === "singles" && initialSingles.length > 0) return;
    if (type === "doubles" && cache.doubles.length > 0) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);

    fetch(`${API_URL}/api/users/leaderboard?type=${type}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return;
        const formatted: LeaderboardPlayer[] = data.map((item: any) => ({
          id: item.id,
          full_name: String(item.full_name ?? ""),
          elo_score: Number(item.elo_score ?? 1000),
          win_rate: item.win_rate ? parseFloat(item.win_rate) : 0,
          rank_name: item.rank_name ?? "",
          total_matches: Number(item.total_matches ?? 0),
        }));
        setCache((prev) => ({ ...prev, [type]: formatted }));
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") console.error("leaderboard:", e);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const board = cache[type];

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return board;
    return board.filter((u) => u.full_name.toLowerCase().includes(q));
  }, [board, deferredQuery]);

  const top3 = useMemo(() => board.slice(0, 3), [board]);

  return (
    <div>
      <div className="flex justify-center mb-8" role="tablist" aria-label="Chọn nội dung thi đấu">
        {(["singles", "doubles"] as const).map((t) => (
          <div key={t} className="inline-flex p-1 rounded-full bg-[#f2f2f2] border border-black/5">
            <button
              role="tab"
              aria-selected={type === t}
              onClick={() => setType(t)}
              className={`px-6 h-10 rounded-full text-sm font-bold transition-all ${
                type === t ? "bg-white shadow text-black" : "text-black/50 hover:text-black"
              }`}
            >
              {t === "singles" ? "Đơn" : "Đôi"}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {loading && board.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="grid md:grid-cols-2 gap-8 rounded-[32px] bg-white border border-black/5 p-4 md:p-6 animate-pulse"
              aria-hidden
            >
              <div className="rounded-3xl bg-black/10 min-h-[220px]" />
              <div className="py-4 space-y-3">
                <div className="h-5 w-24 bg-black/10 rounded" />
                <div className="h-7 w-48 bg-black/10 rounded" />
                <div className="h-4 w-full bg-black/5 rounded" />
              </div>
            </div>
          ))
        ) : (
          top3.map((p, i) => (
            <article
              key={p.id}
              className="grid md:grid-cols-2 gap-8 items-center rounded-[32px] bg-white border border-black/5 shadow-[0_4px_32px_rgba(0,0,0,0.05)] p-4 md:p-6"
            >
              <div className="flex items-center justify-center rounded-3xl bg-black text-white min-h-[220px] relative overflow-hidden">
                <span className="text-[72px] font-black tracking-tighter opacity-95 tabular-nums">
                  {p.elo_score}
                </span>
                <span
                  className={`absolute top-4 left-4 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${getRankBadgeClass(
                    p.rank_name
                  )}`}
                >
                  {i + 1} • {p.rank_name}
                </span>
                <Trophy className="absolute bottom-4 right-4 w-5 h-5 text-yellow-400" aria-hidden />
              </div>
              <div className="px-2 md:px-8 py-4">
                <p className="text-sm text-black/50 font-medium tabular-nums">{p.elo_score} Elo</p>
                <h3 className="text-[28px] font-medium tracking-[-0.03em] mt-1">{p.full_name}</h3>
                <ul className="mt-5 space-y-3 text-[15px]">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                    Hạng {p.rank_name} • Tỷ lệ thắng {Number(p.win_rate).toFixed(1)}%
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                    {p.total_matches} trận đã đấu – Nội dung {type === "singles" ? "Đơn" : "Đôi"}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                    Top {i + 1} CLB SmashTeam
                  </li>
                </ul>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-8 rounded-[24px] border border-black/5 bg-white shadow-sm p-4 md:p-6">
        <div className="mb-4">
          <label htmlFor="player-search" className="sr-only">
            Tìm tay vợt
          </label>
          <input
            id="player-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tay vợt..."
            autoComplete="off"
            className="w-full h-11 px-4 rounded-xl bg-[#f2f2f2] text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>
        <div className="space-y-2 max-h-[380px] overflow-y-auto">
          {filtered.map((u, idx) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-black/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 shrink-0 rounded-full bg-[#f2f2f2] flex items-center justify-center text-sm font-bold tabular-nums">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[15px] truncate">{u.full_name}</p>
                    <span
                      className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded shrink-0 ${getRankBadgeClass(
                        u.rank_name
                      )}`}
                    >
                      {u.rank_name}
                    </span>
                  </div>
                  <p className="text-xs text-black/50 tabular-nums">
                    Tỷ lệ thắng: {Number(u.win_rate).toFixed(1)}% ({u.total_matches} trận)
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black tabular-nums">{u.elo_score}</p>
                <p className="text-[10px] uppercase text-black/40">Elo</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-black/40 italic text-center py-6">
              Không tìm thấy thành viên nào phù hợp.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(LeaderboardSection);
