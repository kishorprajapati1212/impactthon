import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";
import App from "./App.jsx";
import NotificationCenter from "./components/UI/NotificationCenter.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <NotificationCenter />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
