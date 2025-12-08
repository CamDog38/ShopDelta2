import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Data Is Beautiful - Wrap Prototype
        </h1>
        <p className="text-sm text-slate-400">
          Desktop-only, in-app Instagram-style wrap UI.
        </p>
        <Link
          href="/wrap"
          className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100"
        >
          Open Wrap Demo
        </Link>
      </div>
    </main>
  );
}
