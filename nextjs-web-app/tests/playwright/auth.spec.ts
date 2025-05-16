import { test, expect } from "@playwright/test";

test.describe("Signup Modal Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the AuthService to prevent actual network requests
    await page.addInitScript(() => {
      interface WindowWithAuthService extends Window {
        AuthService?: {
          signupWithEmail: (email: string, password: string) => Promise<{ error: null | { message: string }, data: { user: { email: string } } | null }>;
          signInWithGoogle: () => Promise<{ error: null | { message: string }, data: { user: { email: string } } | null }>;
        };
      }
      
      (window as WindowWithAuthService).AuthService = {
        signupWithEmail: async (_email: string, _password: string) => {
          console.log("Signing up with email:", _email, "password:", _password);
          return {
            error: null,
            data: { user: { email: "test@example.com" } }
          };
        },
        signInWithGoogle: async () => ({
          error: null,
          data: { user: { email: "user@example.com" } }
        })
      };
    });
    
    await page.goto("/");
  });

  test("should validate email and password inputs", async ({ page }) => {
    await page.click("button:has-text('Sign Up')");
    
    // Test empty submission
    await page.click("button[type=submit]");
    await expect(page.locator("text=Email is required")).toBeVisible();
    await expect(page.locator("text=Password is required")).toBeVisible();
    
    // Test invalid email
    await page.fill("#email", "invalid-email");
    await page.click("button[type=submit]");
    await expect(page.locator("text=Email is invalid")).toBeVisible();
    
    // Test short password
    await page.fill("#password", "1234567");
    await page.click("button[type=submit]");
    await expect(page.locator("text=Password must be at least 8 characters")).toBeVisible();
  });

  test("should handle successful signup", async ({ page }) => {
    await page.click("button:has-text('Sign Up')");
    
    await page.fill("#email", "test@example.com");
    await page.fill("#password", "password123");
    
    await page.click("button[type=submit]");
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
  });

  test("should handle Google signup", async ({ page }) => {
    await page.click("button:has-text('Sign Up')");
    await page.click("button:has-text('Continue with Google')");
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
  });

  test("should display error messages on failed signup", async ({ page }) => {
    // Mock a failed signup
    await page.addInitScript(() => {
      interface WindowWithAuthService extends Window {
        AuthService?: {
          signupWithEmail: (email: string, password: string) => Promise<{ error: { message: string }, data: null }>;
          signInWithGoogle: () => Promise<{ error: null, data: { user: { email: string } } | null }>;
        };
      }
      
      (window as WindowWithAuthService).AuthService = {
        signupWithEmail: async (_email: string, _password: string) => {
          console.log("Failed signup attempt with:", _email, _password);
          return {
            error: { message: "Email already exists" },
            data: null
          };
        },
        signInWithGoogle: async () => ({
          error: null,
          data: { user: { email: "user@example.com" } }
        })
      };
    });
    
    await page.click("button:has-text('Sign Up')");
    
    await page.fill("#email", "existing@example.com");
    await page.fill("#password", "password123");
    
    await page.click("button[type=submit]");
    
    await expect(page.locator("text=Email already exists")).toBeVisible();
  });

  test("should be running on port 3000", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page).toHaveURL("http://localhost:3000");
  });
});
