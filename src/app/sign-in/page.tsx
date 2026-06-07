import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1324] border border-gray-800 rounded-2xl shadow-xl overflow-hidden p-6 flex flex-col items-center">
        <Image src="/BloggEd_Logo.png" alt="BloggEd" height={40} width={134} className="h-10 w-auto mb-6" priority />
        
        <SignIn 
          appearance={{
            variables: {
              colorPrimary: "#1a73e8",
              colorBackground: "#11192e",
              colorText: "#f3f4f6",
              colorInputBackground: "#161f38",
              colorInputText: "#f3f4f6",
              colorBorder: "#374151"
            }
          }}
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
