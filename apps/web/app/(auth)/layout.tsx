import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TransformHer — Account",
  description: "Secure access to your TransformHer account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {children}
      </div>
    </main>
  );
}
