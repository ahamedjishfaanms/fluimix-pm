import { Droplets } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(201,147,42,0.18),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(45,98,163,0.35),transparent_50%)]" />
        <div className="relative flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-primary-950">
            <Droplets className="h-5 w-5" />
          </span>
          Fluimix PM
        </div>
        <div className="relative max-w-md">
          <p className="text-2xl font-display font-semibold leading-snug">
            Engineering excellence, one project at a time.
          </p>
          <p className="mt-4 text-sm text-primary-100/80">
            Plan, track and document every Fluimix project — from main programs
            down to the smallest task — in one place built for the team.
          </p>
        </div>
        <p className="relative text-xs text-primary-100/60">
          Access restricted to @fluimix.com accounts
        </p>
      </div>
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
