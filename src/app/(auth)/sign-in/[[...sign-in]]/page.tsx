import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        baseTheme: dark,
        elements: {
          rootBox: "w-full flex justify-center",
          cardBox: "w-full max-w-[460px]",
          card: "w-full p-8",
          headerTitle: "text-2xl font-bold text-white tracking-tight",
          headerSubtitle: "text-sm text-slate-400",
          socialButtonsBlockButton: "h-11 text-sm font-medium bg-white/5 border-white/10 hover:bg-white/10 text-white transition-colors",
          formFieldLabel: "text-sm font-medium text-slate-300",
          formFieldInput: "h-11 text-base rounded-xl bg-white/5 border-white/10 text-white placeholder-slate-500",
          formButtonPrimary: "h-11 text-base font-semibold bg-white text-black hover:bg-slate-200 transition-colors rounded-xl",
          footerActionText: "text-sm text-slate-400",
          footerActionLink: "text-sm font-semibold text-white hover:underline",
        },
      }}
    />
  );
}
