# Robot Academy · SPIKE Prime Simulator

[Launch Robot Academy](https://amireness.github.io/spike-prime-simulator/)

Program the same simulated SPIKE Prime Advanced Driving Base in two classroom lessons. Students use Blockly and a 3D testing arena on the same screen. Each guide presents one step at a time, with a block example when needed. **Previous** and **Next** let students move through the guide freely. **Show me how** loads an editable example.

## Lessons

- **Lesson 5 — Advanced Driving Base** covers the A + E drive motors, wheel calibration, forward and reverse movement, steering, and signed yaw. It includes exact 45°, 90°, and 135° turns, timed turns, the original complete driving program, debugging, and a championship quiz.
- **Lesson 6 — My Blocks** is a roughly 60-minute lesson with 27 experiments across Movement Review (5 min), Create Your First My Block (10 min), Button Controller (10 min), Square Challenge (15 min), and Robot Navigator (12 min). A 15-question Championship Quiz takes about 8 min. Students build reusable actions and test them on a 50 cm square course with two markers 50 cm apart.

The [LEGO Education Lesson 5 reference](https://education.lego.com/en-us/lessons/prime-competition-ready/assembling-an-advanced-driving-base/) and [Lesson 6 reference](https://education.lego.com/en-us/lessons/prime-competition-ready/my-code-our-program/) use the Advanced Driving Base. The Lesson 6 example in Robot Academy includes three editable stacks. **When program starts** configures A + E at 50% and sets 27.63 cm per rotation. **Define Forward** stores a two-rotation move. **When right hub button pressed** calls **Forward**. Run Robot initializes the program. Press **Right hub button** to move 55.26 cm.

## Classroom controls

- **Home** saves your program and opens lesson selection. Each lesson stores its own programs, progress, quiz answers, and challenge timer in this browser. Existing Lesson 5 saves migrate when the app opens. **New student session** asks for confirmation before clearing student data for both lessons.
- **Student Challenge Mode** starts the selected lesson’s timer when the lab opens. The countdown continues across Home navigation, tab changes, and reloads. Students can practice after time expires.
- **Teacher mode** opens a separate workspace and can preview any activity or experiment. Each answer key includes an executable Blockly program, expected behavior, explanations, common mistakes, and quiz answers.
- In Lesson 6, open **My Blocks → Make a My Block**, name the definition, and place actions inside it. Drag the matching call from My Blocks into a start stack, a button stack, a repeat loop, or another definition. Click the definition’s name to rename it. Right-click the definition to delete it. Press **Run Robot** after editing to register the updated button stacks.
- **Pause** holds the current action. **Step** runs one action. **Stop** ends the run and disarms button events. **Reset Robot** returns the robot to the starting position and clears the trail.

The arena uses an ideal differential-drive model. Positive steering turns right, negative steering turns left, and yaw wraps at ±180°. Resetting yaw sets the current facing direction to zero. Wait-until comparisons read the sensor as the robot moves. An unreachable wait stops the motors and displays feedback. Use **Top** to compare paths and distances against the mat.

## Develop and deploy

Install Node.js 24, then run:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Use Chrome with WebGL enabled. In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. The production site is built into `dist/` and served over HTTP. Vite uses relative asset paths for the GitHub Pages repository subpath.

The existing GitHub Pages workflow runs the automated tests and production build, publishes on pushes to `main`, and records the deployment URL in GitHub Actions.
