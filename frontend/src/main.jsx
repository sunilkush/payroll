import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import { store } from "./app/store";
import { AppRouter } from "./routes/AppRouter";
import "antd/dist/reset.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563EB",
          colorSuccess: "#16A34A",
          colorWarning: "#F59E0B",
          colorError: "#DC2626",
          colorBgLayout: "#F8FAFC",
          borderRadius: 10,
        },
      }}
    >
      <AppRouter />
    </ConfigProvider>
  </Provider>
);
