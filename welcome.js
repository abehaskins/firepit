// Copyright 2018, Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const spawn = require("child_process").spawn;
const fork = require("child_process").fork;
const readline = require("readline");
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

const chalk = require("chalk");
const banner = `     ######## #### ########  ######## ########     ###     ######  ########  ##
     ##        ##  ##     ## ##       ##     ##  ##   ##  ##       ##        ##
     ######    ##  ########  ######   ########  #########  ######  ######    ##
     ##        ##  ##    ##  ##       ##     ## ##     ##       ## ##       
     ##       #### ##     ## ######## ########  ##     ##  ######  ########  ##
 `;
const firebase_exe = process.argv[2];
let firebase_bin;

(async () => {
  const line = new Array(process.stdout.columns)
    .fill(undefined)
    .map(() => "#")
    .join("");
  const thin_line = new Array(process.stdout.columns)
    .fill(undefined)
    .map(() => "-")
    .join("");
  console.log(line);
  console.log("");
  console.log("     Welcome to...");
  console.log(chalk.yellow(banner));
  console.log("");
  console.log(line);
  console.log("");
  await CheckFirebaseTools();
  console.log("");
  await CheckIsLoggedIn();
  console.log("");
  console.log(
    `${chalk.green("+")} You can now use the 'firebase' or 'npm' commands!`
  );
  console.log(
    `${chalk.blue("~")} For more help see https://firebase.google.com/docs/cli/`
  );
  console.log("");
  console.log(thin_line);
  process.exit();
})();

async function CheckFirebaseTools() {
  console.log(
    `${chalk.cyan("~")} Let's make sure your Firebase CLI is ready...`
  );
  firebase_bin = await GetFirebaseToolsBins();
  const isSetup = !!firebase_bin;

  if (isSetup) {
    console.log(
      `${chalk.green("+")} Looks like ${chalk.green("your CLI is set up.")}!`
    );
  } else {
    console.log(
      `${chalk.cyan("~")} Looks like ${chalk.yellow(
        "your CLI needs to be set up"
      )}.\n`
    );
    console.log(`${chalk.cyan("~")} This may take a few minutes`);
    process.stdout.write(`${chalk.green("+")} Calling installer...`);

    return new Promise(resolve => {
      const install = spawn(firebase_exe, ["--tool:force-setup"], {});

      install.stderr.on("data", buf => {
        readline.clearLine(process.stdout, 2);
        readline.cursorTo(process.stdout, 2, null);
        const line = (
          buf
            .toString()
            .split("\n")
            .filter(l => l)
            .slice(-1)[0] || ""
        )
          .trim()
          .slice(0, process.stdout.columns - 5);
        process.stdout.write(line);
      });

      install.on("exit", () => {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0, null);
        process.stdout.write(
          `${chalk.green("+")} Alright, ${chalk.green("your CLI is set up")}!\n`
        );
        resolve();
      });
    });
  }
}

async function GetFirebaseToolsBins() {
  return new Promise(resolve => {
    const checkSpawn = spawn(firebase_exe, ["--tool:setup-check"]);
    let checkSpawnData = "";

    checkSpawn.stdout.on("data", buf => {
      checkSpawnData += buf;
    });

    checkSpawn.on("close", () => {
      firebase_bin = JSON.parse(checkSpawnData).bins[0];
      resolve(firebase_bin);
    });
  });
}

async function CheckIsLoggedIn() {
  firebase_bin = firebase_bin || (await GetFirebaseToolsBins());
  return new Promise(resolve => {
    const finish = SimpleSpinner(
      `${chalk.cyan("~")} Checking your Firebase credentials`
    );
    const listSpawn = fork(firebase_bin, ["list", "--json"], { silent: true });
    let listSpawnData = "";

    listSpawn.stdout.on("data", buf => {
      listSpawnData += buf;
    });

    listSpawn.on("close", () => {
      const isLoggedIn =
        JSON.parse(listSpawnData.toString()).status === "success";

      if (!isLoggedIn) {
        finish(
          "🚫",
          `${chalk.cyan(
            "~"
          )} Looks like you're not authenticated. ${chalk.yellow(
            "Let's log in"
          )}!\n`
        );
      } else {
        finish("", "");
      }

      const login = fork(firebase_bin, ["login"], { stdio: "inherit" });
      login.on("exit", () => {
        resolve(isLoggedIn);
      });
    });
  });
}

function SimpleSpinner(message) {
  const icons = ["", ".", "..", "..."];
  let index = 0;

  const cancel = setInterval(() => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0, null);
    process.stdout.write(message + chalk.white(icons[index]));

    index++;
    index %= icons.length;
  }, 300);

  return (_, final_message) => {
    clearInterval(cancel);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0, null);
    process.stdout.write(final_message);
  };
}

function FancySpinner(message) {
  const icons = ["⢿", "⣻", "⣽", "⣾", "⣷", "⣯", "⣟", "⡿"];
  let index = 0;

  const cancel = setInterval(() => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0, null);
    process.stdout.write(chalk.white(icons[index]) + " " + message);

    index++;
    index %= icons.length;
  }, 100);

  return (icon, final_message) => {
    clearInterval(cancel);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0, null);
    process.stdout.write(chalk.white(icon) + " " + final_message);
  };
}
