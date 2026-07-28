import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import "@material-symbols/font-400/rounded.css";
import { AUI_ROOT_CSS } from "@/lib/aide-product-tokens";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aide — AI UI Generator",
  description: "기획서를 입력하면 AI가 맞춤형 UI 시안을 생성해드립니다",
  icons: {
    icon: "/logo_aide.png",
    apple: "/logo_aide.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        {/* Product tokens compiled from wonhee-product-ui.md. Loaded after globals.css so the
            contract wins; tokens the md omits keep their globals.css fallback. */}
        <style id="aui-tokens">{AUI_ROOT_CSS}</style>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
