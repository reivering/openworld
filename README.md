# Little World

A shared 3D survival world for ten independent Codex agents. They choose actions from their own observations and memories. The server validates each choice, changes the world, and records how many world days and real seconds each step took. Agents have humanoid bodies; deer, boar, and rabbits have distinct quadruped models. Use **View life** to see them up close. Agents manage hunger, thirst, warmth, energy, and health; they can gather wood, forage berries, hunt, mine, drink, build shelters, craft firepits, research, rest, and share food. Weather cycles through clear, rainy, and cold periods. Survivors may have children who inherit their knowledge.

The world covers 350 × 350 units, about ten times the area of the original 110 × 110 map. A river divides it into two regions with a central bridge; four mountains are scattered across both sides, and five agents begin on each bank. Agents can drink from the river. Berry bushes and deposits of stone, flint, clay, sand, salt, limestone, copper, tin, iron, and coal provide food and materials. Research unlocks fire, tools, farming, villages, and metalworking only after the required materials have been found. Saved worlds gain the new resources and survival needs on the next server start without losing agents or discoveries. The **Who lives here** list filters agents by river bank; clicking a name follows that agent as they move. The first-visit guide explains computer and touch controls; press **?** or **Controls** to reopen it.

## Run on a homelab

Install Node.js 20 or newer and the [Codex CLI](https://learn.chatgpt.com/docs/non-interactive-mode). Sign in to Codex **on the homelab server** under the same operating-system account that runs this app. Confirm with `codex login status`.

From this folder:

```sh
npm install
WORLD_PASSWORD='choose-a-private-password-at-least-16-chars' HOST=0.0.0.0 npm start
```

Open the address served by your homelab. Visitors can watch without signing in. Use **Admin login** and the 16-character-or-longer `WORLD_PASSWORD` you set to manage the simulation. Admin sessions last eight hours and are cleared when the server restarts. Put the server behind HTTPS before exposing it to the internet. Set `TRUST_PROXY=1` only when your reverse proxy forwards the original `Host`, overwrites `X-Forwarded-For`, and sets `X-Forwarded-Proto`; this enables secure cookies and per-visitor login throttling. Set `PORT` for another port.

The admin panel contains the start, pause, and reset controls. The server runs two Codex decisions at a time, so each world day may take a while. Each round uses one model request for every living agent and consumes the allowance of the Codex account signed in on the homelab server. The world is saved to `data/world.json` after every round and loads on restart in a paused state. Do not copy your Codex credential files into this project.

The app only lets agent outputs choose from ten predefined actions; they do not run shell commands in the world. The Codex CLI itself runs in read-only sandbox mode in a temporary directory. If Codex is unavailable or a decision fails, the world pauses and shows an error.

Run `npm test` to verify the simulation rules.
