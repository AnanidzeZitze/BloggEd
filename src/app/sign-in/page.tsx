import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <Image src="/BloggEd_Logo.png" alt="BloggEd" height={44} width={148} className="h-11 w-auto mb-8" priority />

        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#1a73e8",
              colorBackground: "#0d1324",
              colorText: "#f8fafc",
              colorTextSecondary: "#cbd5e1",
              colorInputBackground: "#161f38",
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
                backgroundColor: "#0d1324",
                borderRadius: "1rem",
                padding: "2rem",
              },
              headerTitle: { color: "#f8fafc", fontWeight: "700" },
              headerSubtitle: { color: "#94a3b8" },
              socialButtonsBlockButton: {
                border: "1px solid #334155",
                color: "#f1f5f9",
                backgroundColor: "#161f38",
              },
              socialButtonsBlockButtonText: { color: "#f1f5f9", fontWeight: "500" },
              dividerLine: { backgroundColor: "#1e293b" },
              dividerText: { color: "#64748b" },
              formFieldLabel: { color: "#e2e8f0", fontWeight: "500" },
              formFieldInput: {
                backgroundColor: "#161f38",
                border: "1px solid #334155",
                color: "#f8fafc",
              },
              formFieldInputShowPasswordButton: { color: "#94a3b8" },
              formButtonPrimary: {
                backgroundColor: "#1a73e8",
                color: "#ffffff",
                fontWeight: "600",
              },
              footerActionText: { color: "#94a3b8" },
              footerActionLink: { color: "#60a5fa", fontWeight: "600" },
              identityPreviewText: { color: "#e2e8f0" },
              identityPreviewEditButton: { color: "#60a5fa" },
              formResendCodeLink: { color: "#60a5fa" },
              otpCodeFieldInput: {
                border: "1px solid #334155",
                color: "#f8fafc",
                backgroundColor: "#161f38",
              },
              alert: { color: "#fca5a5" },
              alertText: { color: "#fca5a5" },
            },
          }}
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
