import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 15000,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data ||
      err?.message ||
      "Request failed";
    return Promise.reject(new Error(typeof msg === "string" ? msg : "Request failed"));
  }
);
