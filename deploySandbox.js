const { execSync, spawn } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid').v4;

module.exports = (pkg, example) => new Promise(async (resolveModule, rejectModule) => {
  const id = uuid();
  const tmpDir = 'tmp';
  const localRoot = path.join(__dirname, tmpDir, id);

  // Update this at some point to the real website URL
  const endpoint = `https://ak-mk-2-prod.netlify.com/sandbox/${pkg}/${example}`;

  // Fetch a directory listing from the website. This is generated on the website's end as part of the build process.
  const { files } = await fetch(`${endpoint}/sandbox.json`).then(response => response.json())
    .catch(() => rejectModule('Error fetching example metadata. Please confirm that you\'ve provided a published package and example. You might also be seeing this message if your examples don\'t have the extension \'.js\'.'));

  // Create a temporary directory to download files to
  fs.emptyDirSync(localRoot);

  // Pull down example files
  await Promise.all(
    files.map(file => (
      // Get the file data
      fetch(`${endpoint}${file}`)
        .then(response => response.text())
        // Save it in the temporary directory
        .then(text => fs.outputFile(path.join(localRoot, file), text))
    ))
  );

  // This is absurdly hacky
  // We can't install packages globally in Glitch so we install it
  // locally and get the path to it by exec'ing the `npm bin` command 😂
  const codesandboxCmd = `${execSync('npm bin').toString().trim()}/codesandbox`;

  // Use the Codesandbox CLI to deploy the temporary folder
  const url = await new Promise((resolve, reject) => {
    const cli = spawn(codesandboxCmd, [path.join(tmpDir, id)]);
    cli.stdin.setEncoding('utf8');
    cli.stdout.on('data', (dataBuffer) => {
      const data = dataBuffer.toString().trim();

      // This is brittle af
      if (data.match(/Are you sure you want to proceed with the deployment/)) {
        cli.stdin.write('y\n');
      }

      if (data.match(/^> \[error\]/)) {
        reject(data);
      }

      if (data.match(/^> \[success\] http.*/)) {
        const url = data.match(/(http.*\S)/)[0];
        resolve(url);
      }
    });
  }).catch(err => rejectModule(`There was an error deploying to Codesandbox: ${err}`));

  // Clean up
  await fs.remove(localRoot);

  resolveModule(url);
});
