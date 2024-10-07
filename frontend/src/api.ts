import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';
export interface ExpectedWinsData {
  userRedVolume: number;
  userBlueVolume: number;
}
export interface User {
  u_id: string;
  wallet: string;
  nb_bet: number;
  total_volume: number;
  total_payout: number;
  ref_id?: string | null;
  ref_code?: string | null;
  referral_gain?: number;
  country_code: string;
  last_login: string;
  creation_date: string;
}
export interface Bet {
  b_id: string;
  u_id: string;
  m_id: string;
  f_id: string;
  team: 'red' | 'blue';
  volume: number;
  tx_in: string;
  payout: number;
}

const createTokenManager = () => {
  let isAuthenticated = false;
  let encryptedJwtToken: string | null = null;
  let encryptedJwtRefreshToken: string | null = null;
  let cachedJwtToken: string | null = null;

  const ENCRYPTION_KEY = import.meta.env.VITE_REACT_APP_ENCRYPTION_KEY;

  const api = axios.create({
    baseURL: 'https://solty.bet/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const encryptToken = (token: string): string => {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  };

  const decryptToken = (encryptedToken: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const getDecryptedToken = (): string => {
    if (!encryptedJwtToken) {
      throw new Error('Not authenticated');
    }
    if (!cachedJwtToken) {
      cachedJwtToken = decryptToken(encryptedJwtToken);
    }
    return cachedJwtToken;
  };

  const getAuthenticatedApi = (): AxiosInstance => {
    const jwtToken = getDecryptedToken();
    const instance = axios.create({
      baseURL: 'https://solty.bet/api',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
    });

    instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          await refreshToken();
          originalRequest.headers['Authorization'] = `Bearer ${getDecryptedToken()}`;
          return instance(originalRequest);
        }
        return Promise.reject(error);
      }
    );
    return instance;
  };

  const refreshToken = async (): Promise<void> => {
    try {
      if (!encryptedJwtRefreshToken) {
        throw new Error('No refresh token available');
      }
      const refreshToken = decryptToken(encryptedJwtRefreshToken);
      const response = await api.post('/token/refresh/', { refresh: refreshToken });
      if (response.status === 200) {
        encryptedJwtToken = encryptToken(response.data.access);
        cachedJwtToken = null;
        isAuthenticated = true;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Error refreshing token.');
      isAuthenticated = false;
      encryptedJwtToken = null;
      encryptedJwtRefreshToken = null;
      cachedJwtToken = null;
      throw error;
    }
  };

  const API_PASSWORD = import.meta.env.VITE_REACT_APP_API_PASSWORD;
  return {
    getToken: async (): Promise<string> => {
      try {
        const response = await api.post('/token/', {
          username: 'front',
          password: API_PASSWORD
        });
        if (response.status === 200) {
          encryptedJwtToken = encryptToken(response.data.access);
          encryptedJwtRefreshToken = encryptToken(response.data.refresh);
          isAuthenticated = true;
          return getDecryptedToken();
        }
        throw new Error('Authentication failed');
      } catch (error) {
        console.error('Error getting token.');
        throw error;
      }
    },

    isAuthenticated: (): boolean => isAuthenticated,

    getData: async <T>(url: string, params?: Record<string, any>): Promise<T> => {
      if (!isAuthenticated) {
        await tokenManager.getToken();
      }
      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.get<T>(url, { params });
      return response.data;
    },

    postData: async <T>(url: string, data: any): Promise<T> => {
      if (!isAuthenticated) {
        await tokenManager.getToken();
      }
      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.post<T>(url, data);
      return response.data;
    },

    putData: async <T>(url: string, data: any): Promise<T> => {
      if (!isAuthenticated) {
        await tokenManager.getToken();
      }
      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.put<T>(url, data);
      return response.data;
    },

    deleteData: async <T>(url: string): Promise<T> => {
      if (!isAuthenticated) {
        await tokenManager.getToken();
      }
      const authenticatedApi = getAuthenticatedApi();
      const response = await authenticatedApi.delete<T>(url);
      return response.data;
    },

    getUser: async (userId: number): Promise<User> => {
      return tokenManager.getData<User>(`/users/${userId}/`);
    },

    createBet: async (betData: Omit<Bet, 'id'>): Promise<Bet> => {
      return tokenManager.postData<Bet>('/bets/', betData);
    },
  };
};

export const tokenManager = createTokenManager();
export const { getData, postData, putData, deleteData, getUser, createBet } = tokenManager;