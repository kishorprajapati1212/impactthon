import { createSlice } from "@reduxjs/toolkit";

const loadUser = () => {
  try {
    const saved = localStorage.getItem("attendx_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isAuthenticated: true,
        user: parsed.user || null,
        token: parsed.token || null,
      };
    }
  } catch {
    localStorage.removeItem("attendx_user");
  }
  return { isAuthenticated: false, user: null, token: null };
};

const authSlice = createSlice({
  name: "auth",
  initialState: loadUser(),
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem("attendx_user", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      localStorage.removeItem("attendx_user");
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
