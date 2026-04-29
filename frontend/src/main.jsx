import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import { store } from "./app/store";
import { AppRouter } from "./router/AppRouter";
import "antd/dist/reset.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}><ConfigProvider><AppRouter /></ConfigProvider></Provider>
);
