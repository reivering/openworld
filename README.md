# Little World

A shared 3D survival world for ten independent Codex agents. They choose actions from their own observations and memories. The server validates each choice, changes the world, and records how many world days and real seconds each step took. Agents can gather wood, drink, hunt, build, research, rest, and share food. Research unlocks fire, tools, farming, villages, and metalworking. Survivors may have children who inherit their knowledge.

The world covers 350 × 350 units, about ten times the area of the original 110 × 110 map. A river divides it into two regions with a central bridge; mountains are scattered across both sides, and five agents begin on each bank. Agents can drink from the river. Saved worlds gain the new terrain on the next server start without losing agents or discoveries.

## Run on a homelab

Install Node.js 20 or newer and the [Codex CLI](https://learn.chatgpt.com/docs/non-interactive-mode). Sign in to Codex **on the homelab server** under the same operating-system account that runs this app. Confirm with `codex login status`.

From this folder:

```sh
npm install
WORLD_PASSWORD='choose-a-long-private-password' npm start
```

Open `http://SERVER_IP:3010`. Your browser will ask for username `world` and the password you set. Keep this service on a trusted network or behind HTTPS and your homelab's access control; HTTP Basic authentication sends credentials without encryption on plain HTTP. Set `PORT` for another port.

Press **Start agents** to begin. The server runs two Codex decisions at a time, so each world day may take a while. Each round uses one model request for every living agent and consumes your account's allowance. Pause stops after the current round; Start over deletes the saved world. The world is saved to `data/world.json` after every round and loads on restart in a paused state. Do not copy your Codex credential files into this project.

The app only lets agent outputs choose from seven predefined actions; they do not run shell commands in the world. The Codex CLI itself runs in read-only sandbox mode in a temporary directory. If Codex is unavailable or a decision fails, the world pauses and shows an error.

Run `npm test` to verify the simulation rules.
