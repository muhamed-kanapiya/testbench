import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TestBench — Give your next creative a hypothesis",
  description: "Turn one product into a focused creative experiment. Explore three backgrounds while keeping your product, message and layout consistent.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" /></head><body>{children}</body></html>;
}
