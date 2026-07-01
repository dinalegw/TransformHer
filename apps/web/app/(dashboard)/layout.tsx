import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TransformHer — Dashboard",
  description: "Your reading dashboard and premium content hub.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-10 sm:px-8">{children}</div>
    </div>
  );
}
