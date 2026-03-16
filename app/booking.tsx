"use client";

import { useState } from "react";

export default function Booking() {

  const basePrice = 600000;

  const [hours, setHours] = useState(2);
  const [camera, setCamera] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [youtube, setYoutube] = useState(false);
  const [pip, setPip] = useState(false);
  const [intro, setIntro] = useState(false);

  const extraHourPrice = hours > 2 ? (hours - 2) * 150000 : 0;
  const cameraPrice = camera > 1 ? (camera - 1) * 200000 : 0;
  const zoomPrice = zoom ? 200000 : 0;
  const youtubePrice = youtube ? 200000 : 0;
  const pipPrice = pip ? 200000 : 0;
  const introPrice = intro ? 300000 : 0;

  const total =
    basePrice +
    extraHourPrice +
    cameraPrice +
    zoomPrice +
    youtubePrice +
    pipPrice +
    introPrice;

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>

      <h1>MM LIVE 촬영 예약</h1>

      <div style={{ marginTop: 30 }}>

        <div>
          <p>촬영 시간</p>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            <option value={2}>2시간</option>
            <option value={3}>3시간</option>
            <option value={4}>4시간</option>
            <option value={6}>6시간</option>
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          <p>카메라 대수</p>
          <select value={camera} onChange={(e) => setCamera(Number(e.target.value))}>
            <option value={1}>1대</option>
            <option value={2}>2대</option>
            <option value={3}>3대</option>
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          <p>송출 옵션</p>

          <label>
            <input
              type="checkbox"
              checked={zoom}
              onChange={() => setZoom(!zoom)}
            />
            Zoom 송출
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={youtube}
              onChange={() => setYoutube(!youtube)}
            />
            YouTube 라이브
          </label>
        </div>

        <div style={{ marginTop: 20 }}>
          <p>추가 옵션</p>

          <label>
            <input
              type="checkbox"
              checked={pip}
              onChange={() => setPip(!pip)}
            />
            PIP 디자인
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={intro}
              onChange={() => setIntro(!intro)}
            />
            행사 인트로 제작
          </label>
        </div>

        <h2 style={{ marginTop: 40 }}>
          예상 견적: {total.toLocaleString()} 원
        </h2>

      </div>

    </main>
  );
}