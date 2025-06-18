import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "@/components/styled-components-registry";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { GenerationsProvider } from "@/context/GenerationsContext";
import { AuthButtonWrapper } from "@/components/auth/AuthButtonWrapper";
import StripeProvider from "@/components/StripeProvider";

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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/coin.png', type: 'image/png' }
    ],
    apple: "/coin.png",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <StyledComponentsRegistry>
          <ThemeProvider>
            <AuthProvider>
              <GenerationsProvider>
                <StripeProvider>
                  <AuthButtonWrapper />
                  {children}
                </StripeProvider>
              </GenerationsProvider>
            </AuthProvider>
          </ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
