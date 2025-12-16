# 점수 측정 및 표시 데모

주행 거리(km)와 생존 시간(s)을 기반으로 점수를 계산하고, 실시간으로 HUD에 반영하는 간단한 웹 데모입니다. 실제 게임/시뮬레이션에서 재사용할 수 있도록 `ScoreManager` 클래스를 별도로 두어 거리·시간·속도 데이터를 주입하면 곧바로 UI에 반영되도록 구성했습니다.

## 주요 기능
- 100 m 단위의 거리 가중치(기본 5점)와 1초 단위의 시간 가중치(기본 2점)로 총점을 산출
- 주행 시작/일시 정지/초기화, 스냅샷 로그, 목표 속도 조절 UI 제공
- DOM 업데이트 로직을 `ScoreManager` 한 곳에서 관리하여 다른 화면에서도 쉽게 재사용
- `window.applyScoreState({ distanceMeters, elapsedMs, speedKph, running })` 메서드로 외부 시스템 상태를 바로 반영 가능

## 실행 방법
정적 파일이라 별도의 빌드 없이 웹 서버만 있으면 됩니다.

```bash
npx serve .
# 또는
python3 -m http.server
```

브라우저에서 `http://localhost:3000`(serve 기본 포트) 혹은 8000(파이썬)으로 접속하면 HUD를 확인할 수 있습니다.

## 통합 가이드
게임 루프가 이미 존재한다면 아래와 같이 상태를 동기화할 수 있습니다.

```js
// 예시: 차량 위치/시간을 게임엔진에서 계산한 뒤 주입
window.applyScoreState({
  distanceMeters: currentDistance,
  elapsedMs: performance.now() - roundStartTime,
  speedKph: currentSpeed,
  running: isAlive,
});
```

필요 시 `main.js`의 가중치(`distanceWeight`, `timeWeight`, `distanceUnit`)만 조정하면 동일한 UI를 유지한 채 다른 배점 정책을 적용할 수 있습니다.

## 파일 구성
- `index.html`: HUD 구조 및 컨트롤
- `styles.css`: 카드형 대시보드 스타일
- `main.js`: 점수 계산, UI 갱신 로직, 외부 연동 API
