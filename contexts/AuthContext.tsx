import { createContext, ReactNode, useEffect, useState } from "react";
import { setCookie, parseCookies } from "nookies";
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
  user: User | undefined;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();

  const isAuthenticated = !!user;

  useEffect(() => {
    const { "nextauth.token": token } = parseCookies();

    if (token) {
      api.get("/me").then((response) => {
        const { email, permissions, roles } = response.data;
        setUser({ email, permissions, roles });
      });
    }
  }, []);

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

      /**
       * SetCookie vem da lib NOOKIE(Next Cookie) lib para ter um melhor desenpenho pra tratar cookies
       */
      setCookie(undefined, "nextauth.token", token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
      setCookie(undefined, "nextauth.refreshToken", refreshToken, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/", // usado para dizer em quais rotas da APP eu vou poder utilizar esse cookie. No caso são todas
      });

      setUser({ email, permissions, roles });

      //atualiza o header dentro do método padrão do Axios
      api.defaults.headers["Authorization"] = `Bearer ${token}`;

      Router.push("/dashboard");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, SignIn, user }}>
      {children}
    </AuthContext.Provider>
  );
}
