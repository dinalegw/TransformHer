import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TransformHer — Luxury ebooks for women",
  description: "TransformHer blends premium ebooks, beautiful reading experiences, and life-changing stories for women.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-black text-white">{children}</section>
  );
}
