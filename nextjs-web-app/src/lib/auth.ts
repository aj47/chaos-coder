// Mock authentication service implementation
interface AuthService {
  signupWithEmail: (email: string, password: string) => Promise<{ error: null | { message: string }, data: { user: { email: string } } | null }>;
  signInWithGoogle: () => Promise<{ error: null | { message: string }, data: { user: { email: string } } | null }>;
}

export const AuthService: AuthService = {
  // Simulate email signup
  signupWithEmail: async (email: string, password: string) => {
    console.log("Signing up with email:", email, "password:", password);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success response
    return { 
      error: null,
      data: { user: { email } }
    };
  },
  
  // Simulate Google sign in
  signInWithGoogle: async () => {
    console.log("Signing in with Google");
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success response
    return { 
      error: null,
      data: { user: { email: "user@example.com" } }
    };
  }
};
