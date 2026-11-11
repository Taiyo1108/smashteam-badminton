import { API_URL } from "@/app/config";
import { getAuthToken, isTokenExpired, redirectToLogin } from "./auth";

export interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipAutoRedirect?: boolean;
}

/**
 * Wrapper tập trung cho fetch() trong toàn bộ ứng dụng:
 * 1. Tự động thêm tiền tố API_URL nếu đường dẫn là path tương đối (/api/...).
 * 2. Tự động kiểm tra hạn token trước khi gửi. Nếu token đã hết hạn: xóa session và điều hướng về trang đăng nhập.
 * 3. Tự động đính kèm header Authorization: Bearer <token>.
 * 4. Bắt lỗi HTTP 401 (hoặc TOKEN_EXPIRED) từ Backend: tự động xóa session và chuyển hướng đăng nhập.
 */
export async function apiFetch(
  input: string | URL,
  options: ApiFetchOptions = {}
): Promise<Response> {
  let urlString = typeof input === "string" ? input : input.toString();

  // 1. Chuẩn hóa URL nếu truyền đường dẫn tương đối
  if (urlString.startsWith("/")) {
    urlString = `${API_URL}${urlString}`;
  }

  const { skipAuth = false, skipAutoRedirect = false, ...fetchOptions } = options;

  // 2. Xử lý token nếu không bật skipAuth
  const headers = new Headers(fetchOptions.headers || {});

  if (!skipAuth) {
    const token = getAuthToken();

    // Nếu có token nhưng đã hết hạn client-side
    if (token && isTokenExpired(token)) {
      if (!skipAutoRedirect) {
        redirectToLogin();
        // Trả về response giả lập 401 TOKEN_EXPIRED để caller không crash
        return new Response(
          JSON.stringify({
            error: "Phiên đăng nhập đã hết hạn.",
            code: "TOKEN_EXPIRED"
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Nếu token còn hạn và chưa có header Authorization
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  fetchOptions.headers = headers;

  // 3. Thực thi fetch
  try {
    const response = await fetch(urlString, fetchOptions);

    // 4. Kiểm tra phản hồi 401 từ server
    if (response.status === 401 && !skipAuth && !skipAutoRedirect) {
      try {
        // Clone response để không tiêu tốn body của caller
        const cloned = response.clone();
        const data = await cloned.json();
        if (
          data.code === "TOKEN_EXPIRED" ||
          data.code === "INVALID_TOKEN" ||
          data.code === "NO_TOKEN" ||
          response.status === 401
        ) {
          redirectToLogin();
        }
      } catch {
        // Nếu response không phải JSON thì 401 vẫn điều hướng
        redirectToLogin();
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
}

export default apiFetch;
