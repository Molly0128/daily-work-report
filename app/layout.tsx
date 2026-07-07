import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "每日工作進度回報系統",
  description: "內部團隊每日工作進度填寫與管理"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
