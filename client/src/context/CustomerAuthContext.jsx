import { createContext, useContext, useEffect, useState } from 'react';
import customerApi, { CUSTOMER_TOKEN } from '../customerApi';

const Ctx = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(CUSTOMER_TOKEN)) return setLoading(false);
    customerApi.get('/me')
      .then((r) => setCustomer(r.data.customer))
      .catch(() => localStorage.removeItem(CUSTOMER_TOKEN))
      .finally(() => setLoading(false));
  }, []);

  const startSession = (data) => {
    localStorage.setItem(CUSTOMER_TOKEN, data.token);
    setCustomer(data.customer);
  };

  const login = async (mobile, refNo) => {
    const { data } = await customerApi.post('/login', { mobile, refNo });
    startSession(data);
  };

  const linkLogin = async (token) => {
    const { data } = await customerApi.post('/link-login', { token });
    startSession(data);
    return data.appointmentId;
  };

  const logout = () => {
    localStorage.removeItem(CUSTOMER_TOKEN);
    setCustomer(null);
  };

  return <Ctx.Provider value={{ customer, loading, login, linkLogin, logout }}>{children}</Ctx.Provider>;
}

export const useCustomer = () => useContext(Ctx);