import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Alosh Store | لوحة التحكم",
  description: "لوحة إدارة متجر علوش ستور للاشتراكات الرقمية",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1e3a8a",
                color: "#fff",
                border: "1px solid #2563eb",
                borderRadius: "12px",
                fontFamily: "Cairo, sans-serif",
                direction: "rtl",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
