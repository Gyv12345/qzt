import { LoginForm } from "./components/login-form";

export function Login() {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      {/* 背景装饰 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div className="w-full max-w-5xl relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
