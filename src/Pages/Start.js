import { useNavigate } from "react-router-dom";

export default function Start() {
  const navigate = useNavigate();

  return (
    <div className="start-container">
      <h1>Car Racing Game</h1>

      <button onClick={() => navigate("/game")} className="start-btn">
        Start Game
      </button>
    </div>
  );
}
