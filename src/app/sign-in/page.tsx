import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1324] border border-gray-800 rounded-2xl shadow-xl overflow-hidden p-6 flex flex-col items-center">
        <div className="flex items-center space-x-2.5 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white font-bold shadow-md shadow-[#1a73e8]/20">
            BP
          </div>
          <span className="text-lg font-bold text-white tracking-tight">BloggEd</span>
        </div>
        
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
