import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Start from "./Pages/Start";
import Game from "./Pages/Game";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/start" element={<Start />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}
