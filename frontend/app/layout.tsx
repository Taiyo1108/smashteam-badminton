import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BgmPlayer from "./components/BgmPlayer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmashTeam | Badminton Club",
  description: "Câu lạc bộ cầu lông SmashTeam - Nơi đam mê hội tụ",
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
    >
      <body className="min-h-full flex flex-col">
        {/* Áp dụng chế độ ban đêm đã lưu (trừ trang chính luôn sáng) để tránh nháy */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("smash-theme")==="dark"&&window.location.pathname!=="/")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
        {children}
        <BgmPlayer />
      </body>
    </html>
  );
}

