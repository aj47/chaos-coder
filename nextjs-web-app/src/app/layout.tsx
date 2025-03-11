import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "@/components/styled-components-registry";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
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
    icon: "/coin.png",
    apple: "/coin.png",
    shortcut: "/coin.png",
  },
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
              <StripeProvider>
                <AuthButtonWrapper />
                {children}
              </StripeProvider>
            </AuthProvider>
          </ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
