import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

// 从 localStorage 或 sessionStorage 获取 token
const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  // 优先从 localStorage 获取，如果没有则从 sessionStorage 获取（用于密码修改和 2FA 设置流程）
  return (
    localStorage.getItem("auth_accessToken") ||
    sessionStorage.getItem("auth_temp_token") ||
    sessionStorage.getItem("auth_temp_password_change")
  );
};

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  // 使用 /api 前缀，通过 Vite 代理转发到后端
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：自动注入 token 和语言设置
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    console.log("[api-client] Request:", {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + "...",
      authHeader: config.headers?.Authorization,
    });
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加 Accept-Language 请求头
    if (config.headers) {
      config.headers["Accept-Language"] =
        localStorage.getItem("i18nextLng") || "zh";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器：统一提取 data 字段和错误处理
axiosInstance.interceptors.response.use(
  (response) => {
    const responseData = response.data as any;

    // 检查是否是标准响应（包含 success, data, message）
    const isStandardResponse =
      responseData &&
      typeof responseData === "object" &&
      "success" in responseData &&
      "data" in responseData;

    // 检查 data 字段是否是分页响应（包含 data, total, page 等字段）
    const isPaginatedResponse =
      isStandardResponse &&
      responseData.data &&
      typeof responseData.data === "object" &&
      "data" in responseData.data &&
      ("total" in responseData.data ||
        "page" in responseData.data ||
        "pageSize" in responseData.data ||
        "totalPages" in responseData.data);

    // 如果是分页响应，提取 data.data（分页对象）
    if (isPaginatedResponse) {
      response.data = responseData.data;
    }
    // 如果是标准响应但不是分页响应，提取 data 字段
    else if (isStandardResponse) {
      response.data = responseData.data;
    }

    return response;
  },
  (error: AxiosError) => {
    // 401 未授权：清除 token 并跳转登录
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_accessToken");
        localStorage.removeItem("auth_user");
        // 清除临时存储的 token（用于密码修改和 2FA 设置流程）
        sessionStorage.removeItem("auth_temp_token");
        sessionStorage.removeItem("auth_temp_user");
        sessionStorage.removeItem("auth_temp_password_change");
        sessionStorage.removeItem("auth_temp_requires2FA");
        // 不直接跳转，由 AuthContext 处理
        window.dispatchEvent(new CustomEvent("unauthorized"));
      }
    }

    // 统一错误提示
    error.message =
      (error.response?.data as any)?.message || error.message || "请求失败";

    return Promise.reject(error);
  },
);

// Orval 要求导出一个函数，接收请求配置并返回 Promise
export const customInstance = async <T>(config: {
  url: string;
  method: string;
  data?: any;
  params?: any;
  headers?: any;
  baseURL?: string;
}): Promise<T> => {
  console.log("[api-client] 发起请求:", {
    url: config.url,
    method: config.method,
  });
  const response = await axiosInstance.request({
    url: config.url,
    method: config.method as any,
    data: config.data,
    params: config.params,
    headers: config.headers,
  });
  console.log("[api-client] 收到响应:", {
    status: response.status,
    data: response.data,
  });
  return response.data as T;
};

export default axiosInstance;
