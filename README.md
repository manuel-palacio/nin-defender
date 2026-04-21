# GALACTIC DEFENDER

A space shooter game built with HTML5 Canvas and vanilla JavaScript. No frameworks, no dependencies — just pure browser tech.

**Play now:** [galactic-defender.fly.dev](https://galactic-defender.fly.dev/)

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
9 enemy types with unique behaviors and Canvas-drawn visuals:
- **Asteroids** — textured with craters and ridges, big ones split into fragments, some release spiders
- **Enemy Ships** — track player position and shoot back (2 tiers with Midjourney sprite support)
- **Drones** — fast sine-wave swarms of 3-5
- **Spider Drones** — animated legs, mandibles, multiple eyes, shoot green web projectiles
- **Bombers** — slow and heavy, drop 3-way spread bombs
- **Space Mines** — drift slowly, detonate in a ring of projectiles when you get close
- **Stealth Fighters** — cloak in/out of visibility, zigzag movement
- **Alien Ghosts** — translucent, teleport to new positions
- **Alien Devils** — fiery with horns, charge at player, shoot fireballs

### Phase System
8 progressive difficulty phases, each featuring a dominant enemy type:
1. Asteroid Field (0+)
2. Drone Swarm (300+)
3. Arachnid Sector (700+)
4. Ghost Nebula (1200+)
5. Bomber Wing (1800+)
6. Stealth Zone (2500+)
7. Devil's Domain (3500+)
8. Total Chaos (5000+)

A boss spawns at each phase transition with cycling attack patterns (aimed shots, spiral rings, barrages).

### Environment
- 5 procedurally generated celestial bodies: Moon, Mars, Gas Giant, Ice Planet, Ringed Planet
- 3-layer parallax starfield
- Environmental hazards: solar flares, black holes, asteroid belts

### Progression
- **Combo system** — kill streaks multiply score (x2 through x5)
- **Scrap collection** — earn scrap from kills, persistent across games
- **Weapon upgrades** — damage, fire rate, speed, bomb capacity (localStorage)
- **Trail customization** — 7 unlocked colors
- **Local leaderboard** — top 10 scores

### Audio
- Procedural sound effects via Web Audio API (laser, explosions, power-ups)
- Dark ambient background music: bass drone, pulsing pad, slow dark arpeggio, metallic industrial hits
- Music intensity scales with phase progression

### Visuals
- Midjourney-generated sprite assets with transparent backgrounds
- Canvas fallback rendering for all sprites (game works without images)
- Screen shake, particle explosions, engine trails, shield effects

## Tech Stack

- HTML5 Canvas
- Vanilla JavaScript (no build step)
- Web Audio API (synthesized SFX + procedural music)
- Nginx Alpine (Docker)
- Fly.io (deployment)

## Run Locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Or with Docker:

```bash
docker build -t galactic-defender .
docker run -p 8080:8080 galactic-defender
```

## Deploy

```bash
fly deploy
```

## Asset Generation

Ship and powerup sprites were generated with Midjourney, then processed with ImageMagick to remove black backgrounds:

```bash
# Example: remove black background with fuzz tolerance
magick input.png -fuzz 12% -transparent black output.png
```

NIN lyrics from: Head Like a Hole, Starfuckers Inc., The Big Come Down, Please, The Collector, Every Day Is Exactly The Same, Hurt.
