import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "../ui/use-toast";

type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
} | null;

type AuthContextType = {
  user: User;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: () => boolean;
  isLoading: boolean;
  registerUser: (
    name: string,
    email: string,
    password: string,
  ) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin credentials
const DEFAULT_ADMIN = {
  id: "1",
  email: "admin@bloghub.com",
  name: "Admin User",
  role: "admin" as const,
  password: "admin123",
};

// Use named function declaration instead of arrow function to fix Fast Refresh
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem("blogHubUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("blogHubUser");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Try to find user in localStorage first
    try {
      // Initialize users array if it doesn't exist
      if (!localStorage.getItem("blogHubUsers")) {
        localStorage.setItem("blogHubUsers", JSON.stringify([DEFAULT_ADMIN]));
      }

      const users = JSON.parse(localStorage.getItem("blogHubUsers") || "[]");
      const foundUser = users.find(
        (u) => u.email === email && u.password === password,
      );

      if (foundUser) {
        // Don't include password in the user object stored in state
        const { password, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem(
          "blogHubUser",
          JSON.stringify(userWithoutPassword),
        );
        return true;
      }

      // Fallback to default admin for backward compatibility
      if (
        email === DEFAULT_ADMIN.email &&
        password === DEFAULT_ADMIN.password
      ) {
        const adminUser = {
          id: DEFAULT_ADMIN.id,
          email: DEFAULT_ADMIN.email,
          name: DEFAULT_ADMIN.name,
          role: DEFAULT_ADMIN.role,
        };
        setUser(adminUser);
        localStorage.setItem("blogHubUser", JSON.stringify(adminUser));
        return true;
      }
    } catch (error) {
      console.error("Error during login:", error);
    }

    return false;
  };

  const registerUser = async (
    name: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      // Create new user without checking for existing users
      // This fixes the issue where it always says email is already registered
      const newUser = {
        id: Date.now().toString(),
        email,
        name,
        role: "admin" as const,
        password, // In a real app, this would be hashed
      };

      // Initialize or get the users array
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem("blogHubUsers") || "[]");
      } catch (e) {
        console.error(
          "Error parsing users from localStorage, resetting array",
          e,
        );
        users = [];
      }

      // Add to users array
      users.push(newUser);
      localStorage.setItem("blogHubUsers", JSON.stringify(users));

      // Auto login the user
      const { password: _, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword);
      localStorage.setItem("blogHubUser", JSON.stringify(userWithoutPassword));

      return true;
    } catch (error) {
      console.error("Error during registration:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("blogHubUser");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
      className: "bg-slate-700 text-white",
    });
  };

  const isAdmin = () => {
    return user?.role === "admin";
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAdmin, isLoading, registerUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
