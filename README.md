# Ghost Race

A shared mountain for friends who ski in different places. Each skier drops her descents on the mountain, watches anyone's run ride down again, and climbs a group podium ranked by total kilometres.

The idea is that every skier uploads the GPX recording of a descent and shares it with her group. To fit the time I had, the yeti loads a sample GPX for your skier's colour: it parses it, calculates the stats, saves the run with its GPX attached and plays it on the mountain.

## The interaction

The yeti is the "add a run" button and the interaction with the most states:

- **Idle:** waits, and peeks when you hover or focus it.
- **Loading:** bobs while the run is read and saved.
- **Skiing:** wobbles while your new run goes down the mountain. It stays busy until the skier reaches the bottom.
- **Happy:** hops while you watch any run being replayed.
- **Error:** shakes once and tells you what went wrong. Click it to try again.

Joining a group has its own little story too: a snowman sways while it waits for someone in the group, the yeti carries your runs over, and a crashed skier shows up if the code is wrong.

The other actions show whether they worked: a run fades while it is being deleted and shows the reason if it fails, the invite code turns green with "Copied!", a friend's new run pops up as a notice, and replaying a run highlights it in the list.

## Run it

Use npm, from the repository root:

```sh
npm install
npm start
```

`npm start` builds the React frontend and opens Electron with updates turned off. For hot reload while working on the UI, use `npm run dev`.

## Try it with a friend

Open two windows, each with its own storage:

```sh
npm start -- --storage /tmp/ghost-race-a
```

```sh
npm start -- --storage /tmp/ghost-race-b
```

1. Pick a name and a skier in each window, then click the yeti to drop a run.
2. In the first window open **Invite friends**, click **Invite a friend** and copy the code.
3. In the second window paste the code under **Join with a code**. Choose whether to bring your runs or start from zero.
4. Drop another run in either window. The other one gets a **New run** notice with a **Watch** button, and the podium updates on both.
5. Click a run to replay it, click it again to skip to the end. Click a skier on the podium to see all her runs. You can delete your own runs.

Joining needs someone from the group to be online. While it waits you can cancel it.

## How it uses Autopass

| API                 | In Ghost Race                                                                   |
| ------------------- | ------------------------------------------------------------------------------- |
| `add`               | Saves each skier profile and each run, with the source GPX attached to the run. |
| `remove`            | Deletes one of your runs.                                                       |
| `list`              | Reads every record to build the runs, the podium and who is on the mountain.    |
| `update` event      | Rebuilds the state so local and remote changes show up right away.              |
| Invites and pairing | Lets a friend join the same mountain, bringing her runs or starting fresh.      |

## How the code is organised

Commands go up, state comes down. The React UI only sends commands (`add-run`, `remove-run`, `join`…) through Electron to a Bare worker. The worker owns the Autopass data and, on every change, publishes one snapshot of the whole state that the UI draws.

- `workers/`: GPX parsing and stats, runs and skiers, group joining, and the snapshot.
- `frontend/src/`: the typed worker client, state reducers (the yeti and replays are small state machines), screens and components. Styles are split into tokens, base, shared pieces and one file per component.
- `electron/`: the window and the IPC bridge to the worker.

Every command answers with either a result or an error with a code (`INVALID_GPX`, `NOT_YOURS`, `TIMEOUT`…), and the UI shows that message where the action happened.

Ghost Race is built on [Holepunch's hello-pear-electron template](https://github.com/holepunchto/hello-pear-electron), which provides the Electron and Bare plumbing and the peer-to-peer update setup. Its README covers packaging and releases.

## Checks

```sh
npm test
npm --prefix frontend run typecheck
npm run lint
```

Tests cover the request protocol, the GPX calculations, the snapshot and podium, the group helpers, the replay animation and the UI state machines.

## Known issues

- **Trusted groups only.** Autopass lets any member write any entry. Ghost Race only stops you from deleting someone else's run in the app, and it does not validate what other members write. A bad entry, like an unknown skier colour, shows up as broken images for the whole group.
- **Slow start after a quick restart.** If you close the app and open it again right away on the same storage, the mountain can take more than 30 seconds to show up.
- **Joining can take a while.** Pairing over the public network sometimes takes about a minute.
- **A failure at the very end of joining** can leave the app pointing at an empty mountain on the next start. Your old runs are still on disk.
- **"Start from zero" deletes your old runs** from this device once you join, without warning.
- **Sample GPX files only.** There is one per colour, so every run you add is the same descent with the same date. The parser only reads that simple format: track points with elevation and time.
- **The lines are not a map.** They show distance and elevation, not where the slope really is.

## What's next

- Pick your own GPX file, and later record runs from a phone or import them from a ski app.
- Show falls: detect a sudden stop in the track and make the skier crash on the slope.
- Read-only invites, so a friend can watch without adding runs.
- Leave a group and go back to your own mountain.

## AI assistance

I designed and built Ghost Race and made all the product, technical and visual decisions. I used AI as a coding assistant: to write the Electron and configuration files, to plan the work, to write documentation and tests, and to analyse the Autopass and Pear APIs. I tested the app by hand with two windows, and AI added end-to-end checks on the real app and a code review, which surfaced most of the known issues listed above. The artwork was generated with AI under my direction.
