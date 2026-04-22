# NIN DEFENDER

A Nine Inch Nails-themed space shooter built with HTML5 Canvas and vanilla JavaScript. No frameworks, no dependencies — just pure browser tech.

**Play now:** [nin-defender.fly.dev](https://nin-defender.fly.dev/)

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move ship |
| Space (hold) | Fire weapons |
| E | Activate shield (3 charges, recharges after depletion) |
| Q | Screen-clearing bomb |
| T | Cycle trail color |
| P / Esc | Pause |

Mobile: virtual joystick + fire/shield/bomb touch buttons (landscape only).

## Features

### Enemies
9 creature-themed enemy types with unique behaviors and Canvas-drawn visuals:
- **Asteroids** — textured with craters and ridges, big ones split into fragments
- **Alien Critters** — bug-like creatures with antennae and scuttling legs
- **Space Fireflies** — bioluminescent swarm insects with fluttering wings
- **Space Jellyfish** — translucent bell domes with flowing tentacles, sting on proximity
- **Spider Drones** — animated legs, mandibles, multiple eyes, shoot web projectiles
- **Alien Ghosts** — translucent, teleport to new positions
- **Space Octopus** — tentacled aliens that drop ink bombs
- **Space Chameleons** — color-shifting lizards that cloak in/out of visibility
- **Alien Devils** — fiery with horns, charge at player, shoot fireballs

### Phase System
10 progressive difficulty phases (1-5 easy, 6-10 hard):
1. Asteroid Field
2. Critter Colony
3. Firefly Swarm
4. Jellyfish Drift
5. Arachnid Sector
6. Ghost Nebula
7. Octopus Den
8. Chameleon Void
9. Devil's Domain
10. Total Chaos

A boss spawns at each phase transition — early bosses are simple (1-2 attack patterns, low HP), later bosses get progressively harder with all 3 patterns.

### Environment
- 5 procedurally generated celestial bodies: Moon, Mars, Gas Giant, Ice Planet, Ringed Planet
- 3-layer parallax starfield
- Environmental hazards: solar flares, black holes, asteroid belts (phase 3+)

### Progression
- **Combo system** — kill streaks multiply score (x2 through x5)
- **Scrap collection** — earn scrap from kills, persistent across games
- **Weapon upgrades** — damage, fire rate, speed, bomb capacity (localStorage)
- **Trail customization** — 7 unlocked colors
- **Local leaderboard** — top 10 scores

### Audio
- NIN MP3 soundtrack — randomly cycles tracks during gameplay
- Menu/game-over music: separate NIN track
- Procedural SFX via Web Audio API (explosions, power-ups, enemy hits)
- Music intensity scales with phase progression

### Visuals
- Industrial NIN aesthetic — dark blacks, blood reds, scan line effects
- NIN lyrics displayed as in-game quotes
- Canvas-drawn creatures with unique animations
- Screen shake, particle explosions, engine trails, shield effects

## Tech Stack

- HTML5 Canvas
- Vanilla JavaScript (no build step)
- Web Audio API (synthesized SFX)
- Nginx Alpine (Docker)
- Fly.io (deployment)

## Run Locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Docker:

```bash
docker build -t nin-defender .
docker run -p 8080:8080 nin-defender
```

## Deploy

```bash
fly deploy
```

NIN lyrics from: Head Like a Hole, Starfuckers Inc., The Big Come Down, Please, The Collector, Every Day Is Exactly The Same, Hurt.
