Example of a livereload website project

```
npm install
./build.js -w
```

Open the URL printed when you run `npm start` in a web browser.
Try making changes to the `src/app.ts` file and watch the results in the web browser.

- `./build.js -w` — build in release mode with web server and watch mode
- `./build.js -wg` — build in debug mode with web server and watch mode
- `./build.js` — build in release mode and exit
- `./build.js -g` — build in debug mode and exit
