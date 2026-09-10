import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Phone,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { API_URL } from "@/app/config";
import SiteNav from "@/app/components/home/SiteNav";
import LeaderboardSection from "@/app/components/home/LeaderboardSection";
import FaqSection from "@/app/components/home/FaqSection";
import MediaSection from "@/app/components/home/MediaSection";
import {
  getRankBadgeClass,
  getRankName,
  isVideoUrl,
  type LeaderboardPlayer,
  type MediaItem,
} from "@/app/components/home/rank-utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "SmashTeam | Câu lạc bộ cầu lông",
  description:
    "SmashTeam — CLB cầu lông năng động: xếp hạng Elo minh bạch, lịch tập đều đặn, cộng đồng tay vợt cùng tiến bộ.",
  openGraph: {
    title: "SmashTeam | Đam mê hội tụ",
    description: "Xếp hạng Elo minh bạch, cộng đồng cầu lông năng động tại TP.HCM.",
    type: "website",
  },
};

// ===== Static constants (ngoài component để tránh tạo lại mỗi render) =====
const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=75";
const FALLBACK_TRAINING =
  "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=70";

// Định nghĩa 4 chỉ số trang chủ: key map với GET /api/stats,
// fallback hiển thị khi API lỗi để trang không vỡ layout.
const CLUB_STAT_DEFS = [
  { key: "activeMembers", label: "Hội viên đang hoạt động", fallback: "150+", icon: Users },
  { key: "recordedMatches", label: "Trận đấu đã ghi nhận", fallback: "1.200+", icon: Zap },
  { key: "weeklySessions", label: "Buổi tập mỗi tuần", fallback: "6", icon: CalendarDays },
  { key: "eloTiers", label: "Bậc xếp hạng Elo", fallback: "6", icon: TrendingUp },
] as const;

type ClubStats = {
  activeMembers?: number;
  recordedMatches?: number;
  weeklySessions?: number;
  eloTiers?: number;
};

// Số liệu thật định dạng theo locale vi-VN (1200 -> "1.200").
function formatStat(value: unknown, fallback: string): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("vi-VN")
    : fallback;
}

const RANK_TIERS = [
  { name: "Bronze", range: "< 1100", desc: "Mới gia nhập, làm quen với hệ thống thi đấu." },
  { name: "Silver", range: "1100 - 1199", desc: "Đã có kinh nghiệm thi đấu cơ bản." },
  { name: "Gold", range: "1200 - 1399", desc: "Kỹ năng ổn định, thường xuyên thi đấu." },
  { name: "Platinum", range: "1400 - 1599", desc: "Trình độ khá, tỷ lệ thắng cao." },
  { name: "Diamond", range: "1600 - 1799", desc: "Nhóm tay vợt xuất sắc của CLB." },
  { name: "Challenger", range: "≥ 1800", desc: "Đỉnh cao — vị trí được săn đón nhất." },
] as const;

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Xếp hạng Elo minh bạch",
    desc: "Mọi trận đấu đều được ghi nhận và tính điểm Elo công bằng, cập nhật theo thời gian thực.",
  },
  {
    icon: Users,
    title: "Cộng đồng năng động",
    desc: "Kết nối với các tay vợt cùng trình độ, giao lưu và cùng nhau tiến bộ mỗi ngày.",
  },
  {
    icon: CalendarDays,
    title: "Lịch tập & sự kiện đều đặn",
    desc: "Các buổi tập, giải giao hữu và sự kiện được cập nhật thường xuyên trên trang cá nhân.",
  },
  {
    icon: Trophy,
    title: "Theo dõi tiến bộ cá nhân",
    desc: "Xem lại lịch sử thi đấu, tỷ lệ thắng và hành trình leo hạng của chính mình.",
  },
] as const;

const FAQS = [
  {
    q: "Làm sao để gia nhập SmashTeam?",
    a: 'Bạn chỉ cần bấm nút "Gia nhập ngay", tạo tài khoản và bắt đầu tham gia các buổi tập, trận đấu để được ghi nhận điểm Elo.',
  },
  {
    q: "Điểm Elo được tính như thế nào?",
    a: "Điểm Elo tăng giảm dựa trên kết quả từng trận đấu và trình độ của đối thủ, giúp phản ánh chính xác năng lực hiện tại của bạn.",
  },
  {
    q: "CLB có tổ chức thi đấu đơn và đôi không?",
    a: "Có. Bảng xếp hạng được tách riêng cho nội dung đơn và đôi, bạn có thể theo dõi cả hai ngay trên trang chủ.",
  },
  {
    q: "Tôi cần chuẩn bị gì khi mới tham gia?",
    a: "Chỉ cần mang vợt và tinh thần thoải mái — CLB sẽ hỗ trợ ghép trận phù hợp với trình độ của bạn.",
  },
] as const;

// Đoạn giới thiệu About mặc định (admin sửa trong Quản lý nội dung).
// tail hỗ trợ token {members} (số hội viên thật) và {address} (địa chỉ).
const ABOUT_FALLBACK = [
  { lead: "SmashTeam khởi nguồn từ đam mê cầu lông.", tail: "Từ những buổi tập phong trào, nay là cộng đồng {members} tay vợt cùng tiến bộ." },
  { lead: "Xếp hạng Elo minh bạch, lịch tập & sự kiện đều đặn", tail: " giúp mỗi thành viên theo dõi tiến bộ và leo hạng công bằng." },
  { lead: "Cùng nhau bứt phá giới hạn và tỏa sáng", tail: " — {address}. {org}." },
] as const;

const ADDRESS_FALLBACK = "304 ĐT743A, Đông Hòa, Hồ Chí Minh";
const ORG_FALLBACK = "";

// Kênh mạng xã hội mặc định ở footer (admin sửa link/thêm kênh trong Quản lý Nội dung).
const SOCIAL_FALLBACK = [
  { label: "Facebook", url: "" },
  { label: "Instagram", url: "" },
  { label: "Youtube", url: "" },
] as const;

// Parse chuỗi JSON từ site_settings, rớt về fallback khi lỗi/thiếu.
function parseJsonSetting<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    const parsed = JSON.parse(value) as T;
    return Array.isArray(fallback)
      ? (Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback)
      : (parsed ?? fallback);
  } catch {
    return fallback;
  }
}

// ===== Server-side data fetching (song song, có cache, có fallback) =====
async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function normalizeBoard(data: any[]): LeaderboardPlayer[] {
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    id: item.id,
    full_name: String(item.full_name ?? ""),
    elo_score: Number(item.elo_score ?? 1000),
    win_rate: item.win_rate ? parseFloat(item.win_rate) : 0,
    rank_name: item.rank_name || getRankName(Number(item.elo_score ?? 1000)),
    total_matches: Number(item.total_matches ?? 0),
  }));
}

export default async function Home() {
  const [settings, mediaRaw, singlesRaw, doublesRaw, statsRaw] = await Promise.all([
    fetchJson<any>(`${API_URL}/api/settings`, {}),
    fetchJson<any[]>(`${API_URL}/api/media`, []),
    fetchJson<any[]>(`${API_URL}/api/users/leaderboard?type=singles`, []),
    fetchJson<any[]>(`${API_URL}/api/users/leaderboard?type=doubles`, []),
    fetchJson<ClubStats | null>(`${API_URL}/api/stats`, null),
  ]);

  // Số liệu thật từ API, rớt về fallback cứng khi API lỗi.
  const stats: ClubStats = statsRaw ?? {};
  const clubStats = CLUB_STAT_DEFS.map((s) => ({
    ...s,
    value: formatStat(stats[s.key], s.fallback),
  }));
  const memberLabel = formatStat(stats.activeMembers, "150+");

  // About & Liên hệ do admin chỉnh (Quản lý nội dung), rớt về mặc định khi chưa cấu hình.
  const address = typeof settings?.contact_address === "string" && settings.contact_address
    ? settings.contact_address
    : ADDRESS_FALLBACK;
  const org = typeof settings?.contact_org === "string" && settings.contact_org
    ? settings.contact_org
    : ORG_FALLBACK;
  const applyTokens = (text: string) =>
    text
      .replaceAll("{members}", memberLabel)
      .replaceAll("{address}", address)
      .replaceAll("{org}", org)
      .replaceAll(". .", ".")
      .replace(/\s{2,}/g, " ")
      .trim();
  const rawAbout = parseJsonSetting<{ lead: string; tail: string }[]>(
    settings?.about_blocks,
    [...ABOUT_FALLBACK] as unknown as { lead: string; tail: string }[]
  )
    .map((b) => ({
      lead: String(b?.lead ?? ""),
      tail: applyTokens(String(b?.tail ?? "")),
    }))
    // Bỏ đoạn trống hoàn toàn (admin lưu form trắng) để rớt về mặc định
    .filter((b) => b.lead.trim() || b.tail.trim());
  const aboutBlocks = rawAbout.length > 0
    ? rawAbout
    : ([...ABOUT_FALLBACK] as unknown as { lead: string; tail: string }[]).map((b) => ({
        lead: String(b?.lead ?? ""),
        tail: applyTokens(String(b?.tail ?? "")),
      }));
  // Main contact do admin cấu hình, không còn danh sách cứng trong code.
  const contacts = parseJsonSetting<{ name: string; phone: string; role: string }[]>(
    settings?.contacts,
    []
  ).filter((c) => c && (String(c.name || "").trim() || String(c.phone || "").trim()));
  // Kênh mạng xã hội ở footer Liên hệ do admin cấu hình (thêm/sửa/xóa tùy ý).
  const socialLinks = parseJsonSetting<{ label: string; url: string }[]>(
    settings?.social_links,
    [...SOCIAL_FALLBACK] as unknown as { label: string; url: string }[]
  ).filter((s) => s && String(s.label || "").trim());

  const heroBg =
    typeof settings?.homepage_cover_url === "string" && settings.homepage_cover_url
      ? settings.homepage_cover_url
      : FALLBACK_COVER;

  const mediaFeed: MediaItem[] = Array.isArray(mediaRaw)
    ? mediaRaw.slice(0, 6).map((item: any) => ({
        id: item.id,
        title: String(item.title ?? ""),
        type: isVideoUrl(String(item.content_url ?? "")) ? "video" : "image",
        url: String(item.content_url ?? ""),
      }))
    : [];

  const singles = normalizeBoard(singlesRaw);
  const doubles = normalizeBoard(doublesRaw);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    name: "SmashTeam Badminton Club",
    sport: "Badminton",
    address: "304 ĐT743A, Đông Hòa, Hồ Chí Minh, Việt Nam",
  };

  return (
    <main className="w-full bg-white text-black antialiased scroll-smooth">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      {/* ===== HERO ===== */}
      <header id="hero" className="relative w-full min-h-[100svh] flex items-center overflow-hidden bg-black text-white scroll-mt-24">
        <div className="absolute inset-0">
          <Image
            src={heroBg}
            alt="Sân cầu lông SmashTeam"
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            quality={75}
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-[radial-gradient(35%_42%_at_50%_50%,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/30" />
        </div>
        <div className="relative w-full max-w-[1120px] mx-auto px-6 md:px-10 pt-36 pb-20">
          <div className="max-w-[560px]">
            <div className="flex items-center gap-3 mb-6 animate-fade-up">
              <span className="w-12 h-px bg-white" aria-hidden />
              <span className="text-sm text-white/80 tracking-wide">Câu lạc bộ cầu lông SmashTeam</span>
            </div>
            <h1
              className="font-medium tracking-[-0.05em] leading-[1.05] text-[54px] md:text-[72px] animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              ĐAM MÊ
              <br />
              HỘI TỤ
            </h1>
            <p
              className="mt-6 text-white/70 text-[16px] leading-[1.6] max-w-[480px] animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              Nơi tập hợp những tay vợt tài năng, một môi trường năng động để bạn tỏa sáng và giao lưu.
            </p>
            <div
              className="mt-8 flex flex-wrap gap-3 animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/register"
                className="group flex items-center gap-3 h-12 pl-6 pr-1.5 rounded-full bg-white text-black text-[15px] font-bold hover:bg-white/90 transition-colors"
              >
                Trở thành Thành viên
                <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center group-hover:rotate-45 transition-transform">
                  <ArrowUpRight className="w-4 h-4" aria-hidden />
                </span>
              </Link>
              <a
                href="#rankings"
                className="flex items-center h-12 px-6 rounded-full border border-white/25 text-white text-[15px] font-semibold hover:bg-white/10 transition-colors"
              >
                Xem bảng xếp hạng
              </a>
            </div>
            <div className="mt-10 pl-6 border-l-2 border-white/20 animate-fade-up" style={{ animationDelay: "320ms" }}>
              <div className="flex gap-1 text-white mb-1" aria-label="Đánh giá 5 sao">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-white" aria-hidden />
                ))}
              </div>
              <p className="text-sm text-white/70">{memberLabel} Hội viên đang hoạt động</p>
            </div>
          </div>
        </div>
      </header>

      {/* ===== STATS ===== */}
      <section id="trust" className="bg-white py-24 md:py-[120px] scroll-mt-24">
        <div className="max-w-[1120px] mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-5 gap-10 items-center mb-16">
            <h2 className="md:col-span-3 text-[28px] md:text-[32px] leading-[1.3] tracking-[-0.03em] font-medium text-[#777]">
              <span className="text-black">
                Từ người mới đến tay vợt kỳ cựu, SmashTeam tạo môi trường công bằng
              </span>{" "}
              để bạn bứt phá và tỏa sáng cùng cộng đồng cầu lông năng động.
            </h2>
            <div className="md:col-span-2 relative rounded-2xl overflow-hidden aspect-[5/3] bg-slate-100">
              <Image
                src={FALLBACK_TRAINING}
                alt="Buổi tập của SmashTeam"
                fill
                sizes="(max-width: 768px) 100vw, 420px"
                loading="lazy"
                decoding="async"
                quality={70}
                className="object-cover"
              />
            </div>
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {clubStats.map((s) => (
              <div key={s.label} className="pt-8 border-t-2 border-[#e1e1e1]">
                <dd className="text-[40px] md:text-[52px] leading-none font-medium tracking-tight tabular-nums">
                  {s.value}
                </dd>
                <dt className="mt-2 text-[15px] text-black/70">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== RANKINGS ===== */}
      <section id="rankings" className="bg-white pb-24 md:pb-[100px] scroll-mt-24">
        <div className="max-w-[1120px] mx-auto px-6 md:px-10">
          <h2 className="text-center text-[36px] md:text-[52px] font-medium tracking-[-0.03em]">
            Bảng Xếp Hạng Elo
          </h2>
          <p className="text-center text-black/50 mt-3 mb-12">
            Theo dõi top tay vợt xuất sắc nhất câu lạc bộ qua từng trận đấu.
          </p>

          <LeaderboardSection initialSingles={singles} initialDoubles={doubles} />

          <div className="mt-16">
            <h3 className="text-center text-[28px] font-medium tracking-tight">Hệ Thống Xếp Hạng</h3>
            <p className="text-center text-black/50 mt-2 mb-8">
              6 bậc phản ánh đúng trình độ thi đấu thực tế của bạn.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {RANK_TIERS.map((tier, i) => (
                <div
                  key={tier.name}
                  className="rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
                >
                  <div
                    className={`mx-auto mb-3 w-10 h-10 rounded-full flex items-center justify-center font-black text-xs tabular-nums ${getRankBadgeClass(
                      tier.name
                    )}`}
                  >
                    {i + 1}
                  </div>
                  <h4 className="font-bold">{tier.name}</h4>
                  <p className="text-[11px] font-semibold text-black/50 mt-0.5 tabular-nums">{tier.range}</p>
                  <p className="text-xs text-black/50 mt-2 leading-relaxed">{tier.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MEDIA ===== */}
      {mediaFeed.length > 0 && (
        <section id="media" className="bg-white py-20 scroll-mt-24">
          <div className="max-w-[736px] mx-auto px-6 text-center">
            <div className="flex justify-center gap-1 text-[#f5b614] mb-6" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" />
              ))}
            </div>
            <h2 className="text-[28px] md:text-[32px] font-medium tracking-[-0.03em] leading-[1.3]">
              Hoạt động nổi bật
            </h2>
            <p className="text-black/50 mt-3 mb-10">
              Những khoảnh khắc đáng nhớ trong các buổi tập và giải đấu của SmashTeam.
            </p>
            <MediaSection items={mediaFeed} />
          </div>
        </section>
      )}

      {/* ===== ABOUT ===== */}
      <section id="about" className="bg-black text-white py-20 md:py-[100px] scroll-mt-24">
        <div className="max-w-[1120px] mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12">
          <div className="space-y-16">
            {aboutBlocks.map((b, i) => (
              <p
                key={i}
                className="text-[28px] md:text-[32px] leading-[1.35] tracking-[-0.02em] font-medium text-[#999]"
              >
                <span className="text-white">{b.lead}</span>
                {b.tail ? ` ${b.tail}` : ""}
              </p>
            ))}
          </div>
          <div>
            <address className="flex items-start gap-3 text-white/70 mb-8 not-italic">
              <MapPin className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" aria-hidden />
              <span>{address}, Việt Nam</span>
            </address>
            {contacts.length > 0 && (
              <>
                <h3 className="font-bold mb-4">Main contact</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {contacts.map((c) => (
                <div
                  key={c.phone}
                  className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors"
                >
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/60 mt-1">
                    <Phone className="w-3.5 h-3.5 text-yellow-400" aria-hidden />
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:text-white">
                      {c.phone}
                    </a>
                  </p>
                  <p className="text-[11px] text-yellow-400/80 mt-1">{c.role}</p>
                </div>
              ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="bg-white py-20" aria-labelledby="features-title">
        <div className="max-w-[1120px] mx-auto px-6 md:px-10">
          <h2
            id="features-title"
            className="text-center text-[36px] md:text-[40px] font-medium tracking-[-0.03em]"
          >
            Vì sao gia nhập SmashTeam
          </h2>
          <p className="text-center text-black/50 mt-3 mb-12">
            Môi trường thi đấu công bằng, cộng đồng gắn kết và luôn đồng hành cùng bạn tiến bộ.
          </p>
          <div className="grid md:grid-cols-4 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-black/5 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-yellow-400" aria-hidden />
                  </div>
                  <h3 className="font-bold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-black/55 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="bg-white pb-24 md:pb-[120px] scroll-mt-24">
        <div className="max-w-[736px] mx-auto px-6">
          <p className="text-center text-sm text-[#555]">FAQ</p>
          <h2 className="text-center text-[36px] md:text-[40px] font-medium tracking-[-0.03em] mt-2">
            Câu Hỏi Thường Gặp
          </h2>
          <FaqSection faqs={[...FAQS]} />
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden bg-black text-white py-28 md:py-40">
        <div className="absolute inset-0" aria-hidden>
          <Image
            src={FALLBACK_COVER}
            alt=""
            fill
            sizes="100vw"
            loading="lazy"
            decoding="async"
            quality={60}
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-[radial-gradient(35%_42%_at_50%_50%,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_100%)]" />
        </div>
        <div className="relative max-w-[720px] mx-auto px-6 text-center">
          <h2 className="text-[36px] md:text-[52px] font-medium tracking-[-0.03em] leading-[1.15]">
            Sẵn Sàng Bứt Phá Cùng SmashTeam?
          </h2>
          <p className="mt-4 text-white/70">
            Gia nhập ngay hôm nay để bắt đầu hành trình leo hạng và giao lưu cùng cộng đồng cầu lông năng động.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="group flex items-center gap-3 h-12 pl-6 pr-1.5 rounded-full bg-white text-black font-bold hover:bg-white/90 transition-colors"
            >
              Trở thành Thành viên
              <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center group-hover:rotate-45 transition-transform">
                <ChevronRight className="w-4 h-4" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-black text-white/60 py-16">
        <div className="max-w-[1120px] mx-auto px-6 md:px-10 flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-[320px]">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt="SmashTeam logo"
                width={32}
                height={32}
                loading="lazy"
                className="w-8 h-8 rounded-xl object-cover"
              />
              <span className="font-bold text-white">SmashTeam</span>
            </div>
            <p className="text-sm leading-relaxed">
              Nơi tập hợp những tay vợt tài năng, môi trường năng động để bạn tỏa sáng và giao lưu.
            </p>
            <p className="text-xs mt-4 text-white/40">Designed by SmashTeam • Copyright 2026 © SmashTeam</p>
          </div>
          <nav className="flex gap-20" aria-label="Footer">
            <div>
              <p className="text-white font-semibold mb-4 text-[15px]">Danh mục</p>
              <div className="space-y-2.5 text-sm">
                <a href="#about" className="block hover:text-white">
                  Về chúng tôi
                </a>
                <a href="#rankings" className="block hover:text-white">
                  Bảng xếp hạng
                </a>
                <a href="#media" className="block hover:text-white">
                  Hoạt động
                </a>
                <a href="#faq" className="block hover:text-white">
                  FAQ
                </a>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold mb-4 text-[15px]">Liên hệ</p>
              <div className="space-y-2.5 text-sm">
                {socialLinks.map((s) => {
                  const label = String(s.label || "").trim();
                  const url = String(s.url || "").trim();
                  return url ? (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:text-white"
                    >
                      {label}
                    </a>
                  ) : (
                    <span key={label} className="block">
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
        <div className="max-w-[1120px] mx-auto px-6 md:px-10 mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/40">
          © 2026 SmashTeam Badminton Club. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
