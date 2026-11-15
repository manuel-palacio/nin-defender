# NIN DEFENDER

A Nine Inch Nails-themed space shooter built with HTML5 Canvas and vanilla JavaScript, with a WebGL post-processing pass on top.

**Play now:** [nin-defender.fly.dev](https://nin-defender.fly.dev/)

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move ship |
| Space (hold) | Fire weapons |
| E | Activate shield (charges, recharges after depletion) |
| Q | Screen-clearing bomb |
| T | Cycle trail color (11 colors) |
| Y | Cycle ship skin (Classic, Stealth, Viper, Tank) |
| Left/Right | Select difficulty on menu |
| Up/Down | Toggle run mode on menu (Classic / Daily seeded run) |
| P / Esc | Pause (with Resume/Restart/Main Menu) |

Mobile: virtual joystick + fire/shield/bomb touch buttons (landscape only). PWA installable — add to home screen for fullscreen.

### Easter Eggs

Type during gameplay: `HURT` for god mode, `CLOSER` to spawn the final boss.

## Features

### Enemies
Canvas-drawn creatures, one per phase, each a lit volume with glowing eyes and tapered limbs:
- **Asteroids** — textured with craters and ridges, split into fragments on destruction
- **Critters** — armoured bugs with snapping mandibles and scuttling legs; the violet brood-carrier is the tougher tier
- **Fireflies** — an eye for a head, blurred wings, a pulsing lantern abdomen; they swarm in strings
- **Jellyfish** — translucent bell with a slit eye inside, stinging tentacles; bursts into a ring of stingers when you come close
- **Spiders** — skull-marked abdomen, red eye cluster, eight high-stepping legs, shoot web projectiles
- **Ghosts** — skull specters trailing ectoplasm; teleport to new positions
- **Octopuses** — mottled mantle, one live eye and one dead, sucker-lined arms; drop ink bombs
- **Chameleons** — colour-cycling lizards that cloak until only the eyes are left
- **Devils** — horned heads of cracked rock with a mane of fire; charge at the player and shoot fireballs

### Bosses
Each phase ends with the monarch of that phase. Every boss visibly comes apart as its health drains:

| Phase | Boss | Visual |
|-------|------|--------|
| 1 | Bronze Colossus | Living asteroid: bronze slabs around a molten heart, furnace eye, boulder fists |
| 2 | Crimson Scout | Critter queen: crowned head, great mandibles, glowing egg sac |
| 3 | Viral Swarm | Firefly monarch: vast lantern abdomen, circling swarm |
| 4 | Crimson Maw | Jellyfish titan: three-eyed bell over a ring of fangs |
| 5 | Spider Queen | Skull-faced abdomen, venom fangs, eight independent legs |
| 6 | Phantom Wailer | Great crowned skull with a hanging jaw and a storm of ectoplasm |
| 7 | Void Bomber | Kraken: towering mantle, eight arms, two clubbed feelers |
| 8 | Stealth Wraith | Chameleon lord: shimmering bands, lashing tongue, turret eyes |
| 9 | Inferno Lord | Four-horned devil with a furnace maw |
| 10 | Chaos Harbinger | Black idol with a wheel of bone blades, a ring of eyes and wings of fire |

Bosses have evasive AI — they dodge away from player fire and perform strafing maneuvers. Each tier also has one of three fight archetypes, announced on its intro panel:
- **Charger** — telegraphs with a red shudder, then dashes across the screen. Contact hurts.
- **Summoner** — shielded (30% damage) while its brood lives. Kill the minions first.
- **Armored** — takes 20% damage until its core opens for a short window.

Beating **TOTAL CHAOS** and pushing past 72,000 points summons the **Chaos Harbinger**, the run's final boss. Killing it shows the victory screen, records a ★ on the leaderboard, and unlocks endless mode for that run.

### Phase System
10 progressive difficulty phases with smooth exponential spawn curve:
1. Asteroid Field
2. Critter Colony
3. Firefly Swarm
4. Jellyfish Drift
5. Arachnid Sector
6. Ghost Nebula
7. Octopus Den
8. Chameleon Void
9. Devil's Domain
10. Total Chaos (double spawns, 40% flanking)

Phase transitions clear the screen, pause spawning, and announce the next phase. Enemies flank from behind starting at phase 5. Enemy formations (V, Wall, Pincer, Spiral) appear from phase 3+.

### Difficulty
Three difficulty modes selectable on the menu screen:
- **Easy** — 8 lives, slow spawns, 50% boss bullet speed
- **Normal** — 6 lives, standard spawns
- **Brutal** — 4 lives, fast spawns, 130% boss bullet speed

Selection persists across sessions.

### Upgrade Shop
After each boss kill, an inter-wave shop opens where you spend scrap on permanent upgrades:
- **Damage** — +0.5 bullet damage per level
- **Fire Rate** — faster shooting
- **Speed** — +30 ship speed per level
- **Bombs** — +1 max bomb per level
- **Shields** — +1 shield charge per level
- **Max Lives** — +1 max life per level

All purchases persist across games via localStorage.

### Power-ups
7 collectible power-ups that drop during gameplay:
- **Rapid Fire** — 2.5x fire rate for 8 seconds
- **Triple Shot** — 3 bullets per shot for 10 seconds
- **Shield** — absorbs one hit for 12 seconds
- **Extra Life** — +1 life
- **Ricochet** — orange bouncing bullets for 12 seconds (3 bounces)
- **Wingman** — NIN-themed AI attack drone companion for 15 seconds
- **Power Combo** — stacking 2+ power-ups gives 2x-3x score multiplier

### Environment
- Celestial bodies: Midjourney moon sprite + procedural canvas planets (Mars, Gas Giant, Ice Planet, Ringed Planet)
- NIN logos on planet surfaces
- 3-layer parallax starfield
- Environmental hazards: solar flares, black holes (bend all bullets), asteroid belts

### Progression
- **Scrap drops** — scrap lands where enemies die and drifts left; fly out to collect it (magnet range ~130px)
- **Graze** — skim an enemy bullet without being hit to score and keep the combo alive
- **Frontline bonus** — kills made in the right half of the screen score 1.5x
- **Losing a life** clears the combo and every timed power-up, and the HUD names what hit you
- **Daily run** — seeded by the date so everyone fights the same spawn sequence (D on the leaderboard)
- **Combo system** — kill streaks multiply score (x2 through x5)
- **Chain explosions** — kills damage nearby enemies within 60px
- **Scrap collection** — earn scrap from kills, spend in upgrade shop
- **Speed run timer** — phase timer shown in HUD
- **Leaderboard** — top 10 scores with phase, time, and max combo data
- **Trail customization** — 11 trail colors (T key)
- **Ship skins** — 4 distinct hull designs: Classic, Stealth, Viper, Tank (Y key)
- **Rage mode** — 3s invincibility on respawn

### Audio
- 11 NIN MP3 tracks cycling randomly during gameplay
- Menu/game-over music: "Me, I'm Not"
- Song-specific lyrics displayed as animated comic-style words
- Procedural SFX via Web Audio API (explosions pitched by enemy size, rising combo ticks, graze ticks, boss roar with music ducking, victory sting)
- Dedicated SFX bus (quieter than music)

### Visuals
- Industrial NIN aesthetic — dark blacks, blood reds, scan lines; Bebas Neue display type and Share Tech Mono readouts on every screen (HUD, menu, shop, pause, game over)
- WebGL post-FX (G toggles): two-scale bloom, filmic highlight roll-off, colour grade, chromatic aberration on shake, vignette, film grain
- Fractal-noise nebula in two parallax layers, tinted starfield with motion streaks and diffraction spikes, planets with atmosphere haze and day/night shading
- Light from cached glow sprites instead of canvas shadows: teardrop player bolts, haloed enemy bullets, fireball + shockwave-ring explosions, engine plume in the trail colour, backlit enemies and pickups
- Boss health bar with name and archetype under the phase title
- Ship tilts when moving vertically, bullets follow tilt angle
- Power-up hull glow cycles through active power-up colors
- Life bar under player ship (green/orange/red)
- Enemy bullets share one look (dark outline, magenta body, white core); planets dim during combat; on-screen enemy cap scales with screen area
- Hit flash on damaged enemies, floating score popups
- Animated lyrics: Impact font, per-word random colors, pop-in scale, slow fade
- GAME_SCALE factor for mobile responsiveness
- Auto cache-busting via build timestamp

## Tech Stack

- HTML5 Canvas + a WebGL post-processing overlay (no game framework)
- Vanilla JavaScript modules, bundled by Vite; GSAP for UI tweens, Zod for stored data
- Web Audio API (synthesized SFX)
- Bebas Neue and Share Tech Mono, bundled from Fontsource (no font CDN at runtime)
- Nginx Alpine (Docker)
- Fly.io (deployment, 2 machines, auto-sleep)
- ImageMagick (sprite processing)
- Midjourney (ship sprite generation)

## Run Locally

```bash
npm install
npm run dev
# open http://localhost:5173
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

## Songs

| Track | File |
|-------|------|
| The Collector | the-collector.mp3 |
| Discipline | discipline.mp3 |
| Beginning of the End | beginning-of-the-end.mp3 |
| Capital G | capital-g.mp3 |
| The Good Soldier | the-good-soldier.mp3 |
| Great Destroyer | great-destroyer.mp3 |
| Deep | deep.mp3 |
| Not So Pretty Now | not-so-pretty-now.mp3 |
| Non-Entity | non-entity.mp3 |
| The Day the World Went Away | the-day-the-world-went-away.mp3 |
| Me, I'm Not (menu) | me-im-not.mp3 |

Lyrics sourced from each song and displayed in-game when that song is playing.

## Credits

- Music: Nine Inch Nails remixes sourced from the now-defunct **remix.nin.com** (official NIN remix site)
- Moon sprite: Generated with Midjourney
- Player ship sprite: Generated with Midjourney
- Everything else: HTML5 Canvas + vanilla JS
