import { createRoot } from "react-dom/client";
import "./styles.css";
import "./gm-data.js"; // baked offline fallback — sets window.GM_MONTHLY / GM_CAMPAIGNS / GM_TOTALS
import "./gm-content-data.js"; // baked Content Tracker fallback — sets window.GM_CONTENT_ROWS
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
