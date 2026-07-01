import { createSlice } from "@reduxjs/toolkit";
const getInitialState = () => {
  try { const s = localStorage.getItem("attendx_user"); if (s) { const p = JSON.parse(s); return { isAuthenticated: true, user: p.user || null, token: p.token || null }; } } catch { localStorage.removeItem("attendx_user"); }
  return { isAuthenticated: false, user: null, token: null };
};
const authSlice = createSlice({
  name: "auth", initialState: getInitialState(),
  reducers: {
    login: (s, a) => { s.isAuthenticated = true; s.user = a.payload.user; s.token = a.payload.token; localStorage.setItem("attendx_user", JSON.stringify(a.payload)); },
    logout: (s) => { s.isAuthenticated = false; s.user = null; s.token = null; localStorage.removeItem("attendx_user"); },
  }
});
export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
