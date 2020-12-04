const { spawn } = require("child_process");

const child = spawn("find", ["."]);

child.stdout.on("data", (data) => {
  console.log(`stdout:\n${data}`);
});

child.stderr.on("data", (data) => {
  console.error(`stderr: ${data}`);
});
