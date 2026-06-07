import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <Image src="/BloggEd_Logo.png" alt="BloggEd" height={44} width={148} className="h-11 w-auto mb-8" priority />

        <SignUp
          appearance={{
            variables: {
              colorPrimary: "var(--accent)",
              colorBackground: "var(--bg-surface)",
              colorText: "#f8fafc",
              colorTextSecondary: "#cbd5e1",
              colorInputBackground: "var(--bg-elevated)",
              colorInputText: "#f8fafc",
              colorBorder: "#475569",
              borderRadius: "0.75rem",
              fontSize: "0.9rem",
            },
            elements: {
              rootBox: { width: "100%" },
              card: {
                width: "100%",
                boxShadow: "0 0 0 1px #1e293b",
                border: "1px solid #1e293b",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "1rem",
                padding: "2rem",
              },
              headerTitle: { color: "#f8fafc", fontWeight: "700" },
              headerSubtitle: { color: "#94a3b8" },
              socialButtonsBlockButton: {
                border: "1px solid #334155",
                color: "#f1f5f9",
                backgroundColor: "var(--bg-elevated)",
              },
              socialButtonsBlockButtonText: { color: "#f1f5f9", fontWeight: "500" },
              dividerLine: { backgroundColor: "#1e293b" },
              dividerText: { color: "#64748b" },
              formFieldLabel: { color: "#e2e8f0", fontWeight: "500" },
              formFieldInput: {
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid #334155",
                color: "#f8fafc",
              },
              formFieldInputShowPasswordButton: { color: "#94a3b8" },
              formButtonPrimary: {
                backgroundColor: "var(--accent)",
                color: "#ffffff",
                fontWeight: "600",
              },
              footerActionText: { color: "#94a3b8" },
              footerActionLink: { color: "var(--accent-light)", fontWeight: "600" },
              identityPreviewText: { color: "#e2e8f0" },
              identityPreviewEditButton: { color: "var(--accent-light)" },
              formResendCodeLink: { color: "var(--accent-light)" },
              otpCodeFieldInput: {
                border: "1px solid #334155",
                color: "#f8fafc",
                backgroundColor: "var(--bg-elevated)",
              },
              alert: { color: "#fca5a5" },
              alertText: { color: "#fca5a5" },
            },
          }}
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
