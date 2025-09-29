import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "@/components/styled-components-registry";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chaos Coder - Web App Generator",
  description:
    "Generate six different web applications from a single prompt using Groq's LLama3-70B model",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://r.stripe.com" crossOrigin="" />
        <link rel="preconnect" href="https://m.stripe.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://r.stripe.com" />
        <link rel="dns-prefetch" href="https://m.stripe.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <StyledComponentsRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
