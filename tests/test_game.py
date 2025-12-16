import pytest

from racing import Car, LaneChangeInput, RacingGame


def make_game(lane_count: int = 3) -> RacingGame:
    return RacingGame(lane_count=lane_count, player=Car(lane_index=1, y=0.0))


def test_lane_change_respects_track_bounds() -> None:
    game = make_game()

    game.advance(0.016, opponent_speed=0.0, command=LaneChangeInput.LEFT)
    assert game.player.lane_index == 0

    game.advance(game.lane_change_cooldown, opponent_speed=0.0, command=LaneChangeInput.LEFT)
    assert game.player.lane_index == 0  # cannot exit the track

    game.advance(game.lane_change_cooldown, opponent_speed=0.0, command=LaneChangeInput.RIGHT)
    assert game.player.lane_index == 1

    game.advance(game.lane_change_cooldown, opponent_speed=0.0, command=LaneChangeInput.RIGHT)
    assert game.player.lane_index == 2

    game.advance(game.lane_change_cooldown, opponent_speed=0.0, command=LaneChangeInput.RIGHT)
    assert game.player.lane_index == 2


def test_lane_change_cooldown_blocks_spam() -> None:
    game = make_game()

    game.advance(0.016, opponent_speed=0.0, command=LaneChangeInput.RIGHT)
    right_lane = game.player.lane_index

    game.advance(0.01, opponent_speed=0.0, command=LaneChangeInput.LEFT)
    assert game.player.lane_index == right_lane  # cooldown prevents immediate move

    game.advance(game.lane_change_cooldown, opponent_speed=0.0, command=LaneChangeInput.LEFT)
    assert game.player.lane_index == right_lane - 1


def test_collision_detected_when_same_lane_overlaps() -> None:
    game = RacingGame(lane_count=3, player=Car(lane_index=2, y=0.0))
    opponent = game.spawn_opponent(lane_index=2, distance_ahead=5.0, length=4.0)

    collision = game.advance(delta_time=0.2, opponent_speed=20.0)
    assert collision is not None
    assert collision.lane_index == 2
    assert collision.overlap > 0
    assert pytest.approx(opponent.y) == collision.opponent_center


def test_no_collision_for_other_lanes() -> None:
    game = make_game()
    game.spawn_opponent(lane_index=2, distance_ahead=5.0, length=4.0)

    collision = game.advance(delta_time=0.5, opponent_speed=10.0)
    assert collision is None


def test_opponents_removed_after_passing_player() -> None:
    game = RacingGame(
        lane_count=2,
        player=Car(lane_index=0, y=0.0),
        despawn_margin=2.0,
    )
    opponent = game.spawn_opponent(lane_index=1, distance_ahead=2.0, length=3.5)

    game.advance(delta_time=1.0, opponent_speed=6.0)
    assert opponent not in game.opponents
