import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Script Factory - 유튜브 대본 생성기",
  description: "AI를 활용한 유튜브 대본 생성 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Header />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
