import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BgmPlayer from "./components/BgmPlayer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7A22E0",
};

export const metadata: Metadata = {
  title: "SmashTeam | Câu Lạc Bộ Cầu Lông & Hệ Thống Xếp Hạng ELO",
  description: "Câu lạc bộ cầu lông SmashTeam - Nơi đam mê hội tụ, rèn luyện thể thao, nâng hạng ELO và gắn kết cộng đồng vợt thủ đỉnh cao.",
  keywords: ["SmashTeam", "cầu lông", "badminton", "ELO", "bảng xếp hạng", "câu lạc bộ", "thể thao"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
        {children}
        <BgmPlayer />
      </body>
    </html>
  );
}
