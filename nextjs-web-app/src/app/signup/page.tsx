"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { SignupModal } from "@/components/SignupModal";
import { AuthService } from "@/lib/auth";

export default function SignupPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const supabase = AuthService.createClient();
      await AuthService.getCurrentUser(supabase);
      
      // No need to redirect to dashboard if user is logged in
    };
    
    checkUser();
  }, [router]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    router.push("/");
  };

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <SignupModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
