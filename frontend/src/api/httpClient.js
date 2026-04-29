import axios from "axios";

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  withCredentials: true,
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error?.response?.status === 401 && !original?._retry) {
      original._retry = true;
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/auth/refresh-token`, {}, { withCredentials: true });
        return httpClient(original);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export const extractApiError = (error) => error?.response?.data?.message || error?.message || "Something went wrong";
export default httpClient;
