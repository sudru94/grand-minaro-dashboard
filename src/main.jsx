import { createRoot } from "react-dom/client";
import "./styles.css";
import "./gm-data.js"; // baked offline fallback — sets window.GM_MONTHLY / GM_CAMPAIGNS
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
