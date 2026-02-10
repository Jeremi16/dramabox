import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "vidstack/styles/defaults.css";
import "vidstack/styles/community-skin/video.css";
import "vidstack/define/media-player.js";
import "vidstack/define/media-outlet.js";
import "vidstack/define/media-community-skin.js";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
