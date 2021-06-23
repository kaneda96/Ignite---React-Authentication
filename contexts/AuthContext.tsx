import { createContext, ReactNode, useState } from "react";
import { api } from "../services/api";
import Router from "next/router";

type User = {
  email: string;
  roles: string[];
  permissions: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  SignIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();

  const isAuthenticated = !!user;

  async function SignIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { token, refreshToken, roles, permissions } = response.data;

      /**
       * Há algumas formas de se armazenar o token do usuário:
       *  - sessionStorage: Mantem o usuário apenas quando o browser está aberto, o que pode ser problemático dependendo da aplicação.
       *  - localStorage: mantem o usuário mesmo com o browser fechado, porem precisa de gambiarra para funcionar no NextJS por ser SSR (vai precisar de gambiarra e não é legal)
       *  - cokies: forma de armazenamento mais antiga, porem é a mais adequada para essa situação;
       */

      setUser({ email, permissions, roles });

      Router.push("/dashboard");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, SignIn }}>
      {children}
    </AuthContext.Provider>
  );
}
