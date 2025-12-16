from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import List, Optional


class LaneChangeInput(Enum):
    """Directional commands that can be applied to the player vehicle."""

    NONE = auto()
    LEFT = auto()
    RIGHT = auto()


@dataclass
class Car:
    """Represents a vehicle that occupies a discrete lane and a segment on the track."""

    lane_index: int
    y: float
    length: float = 4.2

    @property
    def half_length(self) -> float:
        return self.length * 0.5


@dataclass(frozen=True)
class CollisionEvent:
    """Result of a player/opponent overlap."""

    lane_index: int
    overlap: float
    opponent_center: float


@dataclass
class RacingGame:
    """Core logic that drives lane switching and collision detection."""

    lane_count: int
    lane_change_cooldown: float = 0.15
    despawn_margin: float = 6.0
    player: Car = field(default_factory=lambda: Car(lane_index=0, y=0.0))
    opponents: List[Car] = field(default_factory=list)

    _lane_timer: float = field(init=False, default=0.0)

    def __post_init__(self) -> None:
        if self.lane_count < 1:
            raise ValueError("lane_count must be positive")
        if not 0 <= self.player.lane_index < self.lane_count:
            raise ValueError("player lane is outside the available lane range")

    def spawn_opponent(self, lane_index: int, distance_ahead: float, length: float = 4.2) -> Car:
        """Create an opponent car that will travel towards the player."""

        if not 0 <= lane_index < self.lane_count:
            raise ValueError("lane_index must fall within the configured lanes")
        if distance_ahead <= self.player.y:
            raise ValueError("distance_ahead must be greater than the player's position")
        opponent = Car(lane_index=lane_index, y=distance_ahead, length=length)
        self.opponents.append(opponent)
        return opponent

    def can_change_lane(self, command: LaneChangeInput) -> bool:
        """Return True when the player can satisfy the requested command immediately."""

        if command is LaneChangeInput.NONE or self._lane_timer > 0:
            return False
        if command is LaneChangeInput.LEFT:
            return self.player.lane_index > 0
        if command is LaneChangeInput.RIGHT:
            return self.player.lane_index < self.lane_count - 1
        return False

    def advance(
        self,
        delta_time: float,
        opponent_speed: float,
        command: LaneChangeInput = LaneChangeInput.NONE,
    ) -> Optional[CollisionEvent]:
        """Advance the simulation by delta_time seconds and report collisions."""

        if delta_time < 0:
            raise ValueError("delta_time must be non-negative")
        if opponent_speed < 0:
            raise ValueError("opponent_speed must be non-negative")

        self._tick_cooldown(delta_time)
        self._apply_lane_change(command)
        self._advance_opponents(delta_time, opponent_speed)
        collision = self.detect_collision()
        self._cull_passed_opponents()
        return collision

    def detect_collision(self) -> Optional[CollisionEvent]:
        player_center = self.player.y
        player_half = self.player.half_length
        for opponent in self.opponents:
            if opponent.lane_index != self.player.lane_index:
                continue
            overlap = player_half + opponent.half_length - abs(player_center - opponent.y)
            if overlap > 0:
                return CollisionEvent(
                    lane_index=self.player.lane_index,
                    overlap=overlap,
                    opponent_center=opponent.y,
                )
        return None

    def _tick_cooldown(self, delta_time: float) -> None:
        if self._lane_timer > 0:
            self._lane_timer = max(0.0, self._lane_timer - delta_time)

    def _apply_lane_change(self, command: LaneChangeInput) -> None:
        if not self.can_change_lane(command):
            return
        if command is LaneChangeInput.LEFT:
            self.player.lane_index -= 1
        elif command is LaneChangeInput.RIGHT:
            self.player.lane_index += 1
        self._lane_timer = self.lane_change_cooldown

    def _advance_opponents(self, delta_time: float, opponent_speed: float) -> None:
        if not self.opponents or opponent_speed == 0 or delta_time == 0:
            return
        distance = opponent_speed * delta_time
        for opponent in self.opponents:
            opponent.y -= distance

    def _cull_passed_opponents(self) -> None:
        if not self.opponents:
            return
        player_center = self.player.y
        remaining: List[Car] = []
        for opponent in self.opponents:
            if opponent.y + opponent.half_length < player_center - self.despawn_margin:
                continue
            remaining.append(opponent)
        self.opponents = remaining
