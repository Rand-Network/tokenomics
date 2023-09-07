const readline = require("readline");
const fs = require("fs");

const { exec } = require("child_process");

function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      //console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

function cleanFile(name) {
  return new Promise((resolve, reject) => {
    var oneTime = true;
    const readInterface = readline.createInterface({
      input: fs.createReadStream(
        `${path()}/${name}`
      ),
      console: false,
    });

    var logger = fs.createWriteStream(
      `${path()}/${name}.cleaned`,
      {
        flags: "w",
      }
    );

    readInterface
      .on("line", function (line) {
        if (oneTime) {
          if (line.includes("SPDX-License")) {
            logger.write(`${line}\n`);
            oneTime = false;
          }

        } else {
          //if (line.includes("pragma solidity")) {
          //} else if (line.includes("SPDX-License")) {
          if (line.includes("SPDX-License")) {
          } else if (line.includes("Keyko")) {
          } else if (line.includes("Code and docs")) {
          } else {
            logger.write(`${line}\n`);
          }
        }
      })
      .on("close", function () {
        logger.end();
        console.log("Completed", name);
        resolve("finish");
      })
      .on("error", function () {
        console.error("Error:", error);
      });
  });
}

function path() {
  var p = __dirname.split("/");
  p.pop();
  return p.join("/");
}

module.exports = { execute, cleanFile };