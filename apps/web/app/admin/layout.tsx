import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TransformHer Admin",
  description: "Admin management console for TransformHer.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-10 sm:px-8">{children}</div>
    </div>
  );
}
