# Country Search

Live country search powered by [countries.dev](https://countries.dev) with `AbortController` request cancellation, custom `debounce`, timeout/error differentiation, and TDD.

## Scripts

```bash
npm install        # install dependencies & husky hooks
npm run dev        # start Vite dev server
npm test           # run Vitest unit & race-condition tests
npm run lint       # run TypeScript check & ESLint
npm run format     # format files with Prettier
npm run build      # build production bundle to dist/
```

## Architecture

See [DESIGN.md](./DESIGN.md) for request cancellation, debounce timing, Big O complexity, and clean code notes.
