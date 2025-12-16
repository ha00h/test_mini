# 미니 프로젝트 – 레이싱 이동 로직

플레이어 차량이 3개 이상의 차선을 좌우 입력으로 전환하면서 상대 차량을 피할 수 있도록 한정된 이동/충돌 로직을 파이썬으로 구성했습니다. `src/racing/game.py`에 핵심 규칙이 구현되어 있으며, `tests/test_game.py`로 주요 시나리오를 검증합니다.

## 빠른 사용 예

```python
from racing import LaneChangeInput, RacingGame

game = RacingGame(lane_count=3)
game.spawn_opponent(lane_index=2, distance_ahead=6.0)

# 좌측으로 이동 시도
game.advance(0.016, opponent_speed=0.0, command=LaneChangeInput.LEFT)

# 20 m/s 속도로 접근 중인 차량 시뮬레이션 및 충돌 검사
collision = game.advance(0.25, opponent_speed=20.0)
```

## 테스트 실행

```bash
pytest
```

테스트는 차선 경계, 입력 쿨다운, 충돌 판정, 차량 제거 로직을 포괄적으로 확인합니다.
