export const RULE_VERSION = 12;
export const STEP_MS = 1000 / 60;
export const TUNING = Object.freeze({
  player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5,
  pickup_radius: 1, interact_radius: 2, pulse_cost: 3, pulse_radius: 5,
  night1_duration_s: RULE_VERSION >= 12 ? 240 : 300,
  flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5, pulse_stun_s: 2,
  pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6, shade_speed: 4,
  shade_hit_radius: 1, fall_enabled: true,
  score: {
    per_mote: RULE_VERSION >= 12 ? 5 : 10, per_lantern: 100, per_stun: 5,
    per_second_left: RULE_VERSION >= 12 ? 0 : 2, per_flame_left: 50,
  },
  ...(RULE_VERSION >= 11 ? {
    dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5,
    night2_duration_s: RULE_VERSION >= 12 ? 270 : 330,
    night3_duration_s: RULE_VERSION >= 12 ? 300 : 360,
  } : {}),
  ...(RULE_VERSION >= 12 ? {
    fuel_max: 100, fuel_decay_per_s: 1, fuel_per_mote: 10, relight_cost: 5,
    win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20,
  } : {}),
});
