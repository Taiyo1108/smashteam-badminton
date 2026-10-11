/**
 * Client-side Authentication & Session Utilities
 * Chứa các hàm kiểm tra hạn JWT, dọn dẹp session, và điều hướng đăng nhập.
 */

export interface JwtPayload {
  id?: string;
  role?: string;
  name?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Giải mã phần payload của JWT token trên trình duyệt an toàn (hỗ trợ Unicode tiếng Việt).
 */
export function parseJwt(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn("Lỗi khi giải mã JWT token:", error);
    return null;
  }
}

/**
 * Kiểm tra xem token đã hết hạn hay chưa.
 * Trả về true nếu:
 * - Token không tồn tại hoặc rỗng
 * - Token giải mã bị lỗi hoặc không có trường exp
 * - Thời gian hiện tại >= exp * 1000 (có 5 giây đệm an toàn buffer)
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;

  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  // buffer 5 giây để tránh token hết hạn đúng lúc request đang bay
  const safetyBufferMs = 5000;
  return Date.now() >= payload.exp * 1000 - safetyBufferMs;
}

/**
 * Lấy token xác thực hiện tại từ localStorage.
 * Hỗ trợ cả 'admin_token' và fallback 'token'.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token") || localStorage.getItem("token") || null;
}

/**
 * Lấy thông tin user hiện tại từ localStorage.
 */
export function getStoredUser(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Lấy vai trò user hiện tại ('admin' | 'member' | null).
 */
export function getStoredUserRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_role") || null;
}

/**
 * Dọn dẹp toàn bộ dữ liệu phiên đăng nhập đã lưu trong localStorage.
 */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("admin_token");
  localStorage.removeItem("token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("user");
}

/**
 * Điều hướng người dùng về trang đăng nhập và xóa session đã hết hạn.
 * @param redirectPath Đường dẫn mà người dùng muốn quay lại sau khi đăng nhập lại
 * @param isExpired Có phải do hết hạn phiên làm việc không (mặc định true)
 */
export function redirectToLogin(redirectPath?: string, isExpired = true): void {
  if (typeof window === "undefined") return;

  clearAuthSession();

  const currentPath = redirectPath || (window.location.pathname + window.location.search);
  const params = new URLSearchParams();

  // Chỉ gắn redirect nếu đường dẫn khác với trang login
  if (
    currentPath &&
    currentPath !== "/login" &&
    !currentPath.includes("/admin/login")
  ) {
    params.set("redirect", currentPath);
  }

  if (isExpired) {
    params.set("expired", "1");
  }

  const queryString = params.toString();
  const target = `/login${queryString ? `?${queryString}` : ""}`;

  window.location.href = target;
}
