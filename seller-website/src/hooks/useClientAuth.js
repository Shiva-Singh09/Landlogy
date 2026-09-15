import { useCallback, useState } from 'react';
import { CLIENT_STORE, CLIENT_TOKEN_KEY, CLIENT_USER_KEY, clientLoginApi } from '../api/clientApi';
import { navigate } from '../utils/bus';

export function readClientSession() {
  try {
    const token = CLIENT_STORE.get(CLIENT_TOKEN_KEY);
    const user = JSON.parse(CLIENT_STORE.get(CLIENT_USER_KEY) || 'null');
    if (token && user && user.role === 'seller') {
      return { token, user };
    }
  } catch {}

  return { token: null, user: null };
}

export function useClientAuth() {
  const [auth, setAuth] = useState(() => readClientSession());

  const login = useCallback(async (email, password, remember = true) => {
    const data = await clientLoginApi(email, password);

    if (!data || data.ok === false || !data.token || !data.user) {
      const error = new Error('auth');
      error.status = 401;
      throw error;
    }

    if (data.user.role !== 'seller') {
      const error = new Error('role');
      error.status = 403;
      throw error;
    }

    CLIENT_STORE.set(CLIENT_TOKEN_KEY, data.token, remember);
    CLIENT_STORE.set(CLIENT_USER_KEY, JSON.stringify(data.user), remember);
    setAuth({ token: data.token, user: data.user });
    return data.user;
  }, []);

  const logout = useCallback(() => {
    CLIENT_STORE.clear(CLIENT_TOKEN_KEY);
    CLIENT_STORE.clear(CLIENT_USER_KEY);
    setAuth({ token: null, user: null });
    navigate('/client-login');
  }, []);

  const passwordSetupDone = useCallback(() => {
    setAuth((previous) => {
      if (!previous.user) return previous;
      const nextUser = { ...previous.user, force_password_change: false };

      try {
        if (localStorage.getItem(CLIENT_USER_KEY)) {
          localStorage.setItem(CLIENT_USER_KEY, JSON.stringify(nextUser));
        }
        if (sessionStorage.getItem(CLIENT_USER_KEY)) {
          sessionStorage.setItem(CLIENT_USER_KEY, JSON.stringify(nextUser));
        }
      } catch {}

      return { token: previous.token, user: nextUser };
    });
  }, []);

  return {
    client: auth.user,
    token: auth.token,
    isAuthenticated: Boolean(auth.token && auth.user),
    login,
    logout,
    passwordSetupDone
  };
}
