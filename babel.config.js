const fs = require('fs');
const path = require('path');

function readEnvValue(key) {
  const envPath = path.resolve(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return '';
  }

  const env = fs.readFileSync(envPath, 'utf8');
  const line = env
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    return '';
  }

  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

const serverUrl = readEnvValue('SERVER');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    function injectEnvConstants() {
      return {
        visitor: {
          Identifier(path) {
            if (path.node.name === '__SERVER_URL__') {
              path.replaceWithSourceString(JSON.stringify(serverUrl));
            }
          },
        },
      };
    },
  ],
};
