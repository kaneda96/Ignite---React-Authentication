import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { SignOut } from "../contexts/AuthContext";

let cookies = parseCookies();
let isRefreshing = true;

let requestsFailedQueue: {
  onSuccess: (token: string) => void;
  onFailure: (err: AxiosError<any>) => void;
}[] = [];

export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["nextauth.token"]}`,
  },
});

/**
 * É possível realizar a interpretação de uma request ou response antes da chamada (ou retorno) utilizando o interceptor como mostra o exemplo abaixo
 *
 * use -> esse use (NO CASO DO REPONSE) possui dois parâmetros:
 *  primeiro: caso a chamada tenha dado sucesso.
 *  segundo: caso a chamada tenha dado erro.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      if (err.response?.data.code === "token.expired") {
        cookies = parseCookies();

        const { "nextauth.refreshToken": refreshToken } = cookies;
        const originalConfig = err.config;

        if (isRefreshing) {
          isRefreshing = true;
          api
            .post("/refresh", {
              refreshToken,
            })
            .then((response) => {
              const { token, refreshToken } = response.data;

              setCookie(undefined, "nextauth.token", token, {
                maxAge: 60 * 60 * 24 * 30,
                path: "/",
              });

              setCookie(undefined, "nextauth.refreshToken", refreshToken, {
                maxAge: 60 * 60 * 24 * 30,
                path: "/",
              });

              api.defaults.headers["Authorization"] = `Bearer ${token}`;

              requestsFailedQueue.forEach((request) =>
                request.onSuccess(token)
              );
              requestsFailedQueue = [];
            })
            .catch((err) => {
              requestsFailedQueue.forEach((request) => request.onFailure(err));
              requestsFailedQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return new Promise((resolve, reject) => {
          requestsFailedQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers["Authorization"] = `Bearer ${token}`;

              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
        SignOut();
      }
    } else {
      return Promise.reject(err);
    }
  }
);
