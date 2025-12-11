import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const clickSound = useRef(new Audio("/Click.mp3"));
  const startSound = useRef(new Audio("/music.mp3"));

  const startGame = () => {
    clickSound.current.play();
    setTimeout(() => {
      startSound.current.play();
      navigate("/game");
    }, 150);
  };

  return (
    <div className="home">
      <h1 className="title">Car Racing</h1>
      <button className="start-btn" onClick={startGame}>
        Start Game
      </button>
    </div>
  );
}
