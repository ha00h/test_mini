const $ = (selector) => document.querySelector(selector);

const ui = {
  totalScore: $('[data-role="totalScore"]'),
  scoreBreakdown: $('[data-role="scoreBreakdown"]'),
  distanceValue: $('[data-role="distanceValue"]'),
  distanceMeters: $('[data-role="distanceMeters"]'),
  timeValue: $('[data-role="timeValue"]'),
  deltaTime: $('[data-role="deltaTime"]'),
  speedValue: $('[data-role="speedValue"]'),
  speedMeters: $('[data-role="speedMeters"]'),
  runState: $('[data-role="runState"]'),
  speedLabel: $('[data-role="speedLabel"]'),
  speedInput: $('[data-role="speedInput"]'),
  log: $('[data-role="log"]'),
  toggleButton: $('[data-action="toggle"]'),
  snapshotButton: $('[data-action="snapshot"]'),
  resetButton: $('[data-action="reset"]'),
  distanceWeightLabel: $('[data-role="distanceWeight"]'),
  timeWeightLabel: $('[data-role="timeWeight"]'),
};

const formatNumber = (value, options = {}) =>
  value.toLocaleString("ko-KR", { maximumFractionDigits: 0, ...options });

class ScoreManager {
  constructor({ distanceWeight = 5, timeWeight = 2, distanceUnit = 100 }, uiElements) {
    this.ui = uiElements;
    this.weights = { distanceWeight, timeWeight, distanceUnit };

    this.state = {
      running: false,
      distanceMeters: 0,
      elapsedMs: 0,
      speedKph: Number(this.ui.speedInput?.value) || 80,
    };

    this.deltaReferenceSeconds = 0;
    this.rafId = null;
    this.lastTimestamp = null;

    this.ui.distanceWeightLabel.textContent = distanceWeight;
    this.ui.timeWeightLabel.textContent = timeWeight;
    this.render();
  }

  get seconds() {
    return this.state.elapsedMs / 1000;
  }

  get kilometers() {
    return this.state.distanceMeters / 1000;
  }

  get speedMetersPerSecond() {
    return (this.state.speedKph * 1000) / 3600;
  }

  computeScore() {
    const distanceScore = Math.floor(
      (this.state.distanceMeters / this.weights.distanceUnit) * this.weights.distanceWeight,
    );
    const timeScore = Math.floor(this.seconds * this.weights.timeWeight);
    return {
      distanceScore,
      timeScore,
      total: distanceScore + timeScore,
    };
  }

  start() {
    if (this.state.running) return;
    this.state.running = true;
    this.lastTimestamp = performance.now();
    this.tick(this.lastTimestamp);
    this.render();
  }

  stop() {
    if (!this.state.running) return;
    this.state.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.render();
  }

  toggle() {
    this.state.running ? this.stop() : this.start();
  }

  reset() {
    const hadProgress = this.state.distanceMeters > 0 || this.state.elapsedMs > 0;
    this.stop();
    if (hadProgress) {
      this.deltaReferenceSeconds = 0;
    }
    this.state.distanceMeters = 0;
    this.state.elapsedMs = 0;
    this.clearLog();
    this.render();
  }

  setSpeed(kph) {
    this.state.speedKph = Math.max(0, kph);
    this.render();
  }

  applyExternalState({ distanceMeters, elapsedMs, speedKph, running } = {}) {
    if (typeof distanceMeters === "number") this.state.distanceMeters = Math.max(distanceMeters, 0);
    if (typeof elapsedMs === "number") this.state.elapsedMs = Math.max(elapsedMs, 0);
    if (typeof speedKph === "number") this.state.speedKph = Math.max(speedKph, 0);
    if (typeof running === "boolean") {
      running ? this.start() : this.stop();
    } else {
      this.render();
    }
  }

  snapshot(label = "수동 스냅샷") {
    const { total, distanceScore, timeScore } = this.computeScore();
    const entry = {
      label,
      total,
      distanceKm: this.kilometers,
      timeSec: this.seconds,
      speed: this.state.speedKph,
      createdAt: new Date(),
    };

    this.deltaReferenceSeconds = this.seconds;
    this.addLogEntry(entry);
    this.render();
    return entry;
  }

  tick = (timestamp) => {
    if (!this.state.running) return;
    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.state.elapsedMs += delta;
    this.state.distanceMeters += this.speedMetersPerSecond * (delta / 1000);

    this.render();
    this.rafId = requestAnimationFrame(this.tick);
  };

  clearLog() {
    if (this.ui.log) this.ui.log.innerHTML = "";
  }

  addLogEntry({ label, total, distanceKm, timeSec, speed, createdAt }) {
    if (!this.ui.log) return;
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${formatNumber(total)}점</strong>
      <span>${label} · ${createdAt.toLocaleTimeString("ko-KR")}</span>
      <span>거리 ${distanceKm.toFixed(2)} km · 시간 ${timeSec.toFixed(1)} s · 속도 ${speed.toFixed(
        0,
      )} km/h</span>
    `;
    this.ui.log.prepend(li);

    const maxEntries = 6;
    while (this.ui.log.childElementCount > maxEntries) {
      this.ui.log.removeChild(this.ui.log.lastElementChild);
    }
  }

  render() {
    const { distanceScore, timeScore, total } = this.computeScore();
    const delta = Math.max(this.seconds - this.deltaReferenceSeconds, 0);

    if (this.ui.totalScore) this.ui.totalScore.textContent = formatNumber(total);
    if (this.ui.scoreBreakdown) {
      this.ui.scoreBreakdown.textContent = `거리 ${formatNumber(
        distanceScore,
      )} + 시간 ${formatNumber(timeScore)}`;
    }

    if (this.ui.distanceValue) this.ui.distanceValue.textContent = this.kilometers.toFixed(2);
    if (this.ui.distanceMeters) {
      this.ui.distanceMeters.textContent = formatNumber(Math.round(this.state.distanceMeters));
    }

    if (this.ui.timeValue) this.ui.timeValue.textContent = this.seconds.toFixed(1);
    if (this.ui.deltaTime) this.ui.deltaTime.textContent = `+${delta.toFixed(1)}`;

    if (this.ui.speedValue) this.ui.speedValue.textContent = this.state.speedKph.toFixed(0);
    if (this.ui.speedMeters) this.ui.speedMeters.textContent = this.speedMetersPerSecond.toFixed(2);
    if (this.ui.speedLabel) this.ui.speedLabel.textContent = `${this.state.speedKph.toFixed(0)} km/h`;
    if (this.ui.speedInput) this.ui.speedInput.value = this.state.speedKph;

    if (this.ui.runState) {
      this.ui.runState.textContent = this.state.running ? "진행 중" : "대기 중";
      this.ui.runState.classList.toggle("is-active", this.state.running);
    }

    if (this.ui.toggleButton) {
      this.ui.toggleButton.textContent = this.state.running ? "일시 정지" : "주행 시작";
    }
  }
}

const scoreManager = new ScoreManager(
  {
    distanceWeight: 5, // 100m 당 5점
    timeWeight: 2, // 1초 당 2점
    distanceUnit: 100,
  },
  ui,
);

ui.toggleButton?.addEventListener("click", () => scoreManager.toggle());
ui.resetButton?.addEventListener("click", () => scoreManager.reset());
ui.snapshotButton?.addEventListener("click", () => scoreManager.snapshot());
ui.speedInput?.addEventListener("input", (event) => {
  scoreManager.setSpeed(Number(event.target.value));
});

// 데모용: 외부 시스템에서 값을 강제로 덮어쓰는 예시
window.applyScoreState = (state) => scoreManager.applyExternalState(state);
