# Robot Academy: Advanced Base Challenge

**Competition Ready · Lesson 5 · Assembling an Advanced Base**

**[Launch Robot Academy →](https://amireness.github.io/spike-prime-simulator/)**

A 60-minute classroom game for programming a simulated SPIKE Prime driving base. Students name their robot, start with the Level 1 guided Blockly experiment, and earn badges across six levels. Programs, progress, challenge timing, and personal bests are stored in each student's browser for the site's origin.

## Run locally

Install Node.js 24 LTS, then run from this directory:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173). In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Use Chrome with WebGL enabled for the 3D view.

## Test and preview production

```sh
npm test
npm run build
npm run preview
```

Open the preview URL (usually http://localhost:4173). The production build is in `dist/`. Serve that folder over HTTP. Dependencies, robot geometry, and editor assets are bundled or copied locally. Students need no login or physical robot.

## Deploy with GitHub Pages

1. Create or choose a GitHub repository. Commit the project files, including the lockfile and `.github/workflows/pages.yml`, to its `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` or run **Deploy robotics lab to GitHub Pages** manually in the **Actions** tab.
4. Open the deployment URL listed in the workflow or Pages settings. A project site normally uses `https://<owner>.github.io/<repository>/`.

The workflow runs the tests and builds before publishing. Vite uses relative asset paths so the project can run under a repository subpath.

## Classroom controls
     
Choose **Student Challenge Mode** for the countdown. It begins when the adventure opens and keeps running across refreshes or tab changes. Each experiment asks students to predict, edit, run, observe, and answer a question. **Show me how** loads the current example, including intentionally broken programs for the debugging activities. Use **Results** to review saved progress. Practice can continue after time runs out. **Teacher mode** on the welcome screen provides duration and sound settings, independent level previews, validation criteria, and the teacher reference. Settings apply only in that browser.

Drag blocks from the toolbox and connect them below **When program starts**. Right-click blocks for actions such as Duplicate and Delete. **Run** starts from the starting marker. **Pause** holds the robot and program. **Step** completes one action, including any movement or wait in that action. **Stop** ends the current run and keeps its trail. **Reset robot** clears the arena run. **Reset level** clears that level's saved program and progress and keeps its personal best.

Drag in the arena to orbit and scroll to zoom. Use **Top** to compare the trail with the centimeter grid. Relative yaw increases when turning right and decreases when turning left. The simulator applies an ideal differential-drive model with no wheel slip. For beginners, the rotation count on a steering move measures the faster wheel. A wait-until times out after 15 simulated seconds if its condition stays false.

Validation tests exercise the driving model and mission checkpoints. Test files are outside the production build.
