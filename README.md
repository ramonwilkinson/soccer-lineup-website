# Soccer Lineup Manager

A web app for managing player rotations in 9-a-side youth soccer. Built for a 3-1-3-1 formation with 13 players.

Live at [wilkinson.guru/soccer-lineup](https://wilkinson.guru/soccer-lineup)

## Features

- **Players** — maintain a squad of up to 13 players, each with preferred position types (GK, DEF, MID, ATT)
- **Games** — create games with a name and date; games are listed most-recent-first
- **Configurations** — snapshot lineups at any point in a game (e.g. H1 0', H1 15', H2 0'); drag players from the bench onto the pitch or swap them between positions
- **Bench ordering** — drag-and-drop the bench queue to control substitution order
- **Unavailable players** — mark players absent for a specific game without removing them from the squad
- **Play time summary** — see total minutes on pitch per player across all configurations in a game
- **Print view** — print-optimised layout showing all configurations for a game

## Tech

- React + TypeScript, built with Vite
- Tailwind CSS
- [@dnd-kit](https://dnd-kit.com) for drag-and-drop
- Deployed to S3 + CloudFront under the `wilkinson-guru-website` distribution

## Development

```bash
npm install
npm run dev
```

The app runs standalone with state in memory (no backend required for local dev). If `VITE_API_URL` is set, it syncs state to a REST API using Cognito tokens from the parent site's session.

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that:

1. Builds the app with `base: /soccer-lineup/`
2. Syncs `dist/` to `s3://<bucket>/soccer-lineup/`
3. Invalidates the CloudFront cache for `/soccer-lineup/*`

The S3 bucket and CloudFront distribution are managed by the `wilkinson-guru-website` CDK stack.
