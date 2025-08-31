
import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_APP_SERVER_URL;
const ACCESS_TOKEN = import.meta.env.VITE_APP_ACCESS_TOKEN;

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: SERVER_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    if (ACCESS_TOKEN) {
      config.headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // 인증 에러 처리
    if (error.response?.status === 401) {
      console.error('인증 에러: 토큰이 만료되었거나 유효하지 않습니다.');
      // 필요시 로그인 페이지로 리다이렉트
    }
    
    // 권한 에러 처리
    if (error.response?.status === 403) {
      console.error('권한 에러: 접근 권한이 없습니다.');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;