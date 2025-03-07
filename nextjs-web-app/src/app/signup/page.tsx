"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { SignupModal } from "@/components/SignupModal";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      
      if (data?.user) {
        router.push("/dashboard");
      }
    };
    
    checkUser();
  }, [router]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    router.push("/");
  };

  const handleSuccessfulSignup = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md p-8 rounded-xl shadow-xl ${
          theme === "dark" 
            ? "bg-gray-900 text-white" 
            : "bg-white text-gray-900"
        }`}
      >
        <h1 className="text-2xl font-bold mb-6">Create your account</h1>
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <p className="text-center">
            Please fill out the form to create your account.
          </p>
          <SignupModal 
            isOpen={isModalOpen} 
            onClose={handleCloseModal} 
            onSuccess={handleSuccessfulSignup}
          />
          <button
            onClick={() => router.push("/")}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              theme === "dark"
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
