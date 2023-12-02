import fsPromise from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {js2xml} from 'xml-js';
import * as core from '@actions/core';

type MavenSettings = {
  settings: {
    _attributes: {
      xmlns: string,
      "xmlns:xsi": string,
      "xsi:schemaLocation": string
    },
    activeProfiles: {
      activeProfile: string
    },
    profiles: {
      profile: {
        id: string,
        repositories: {
          repository: {}[]
        }
      }
    },
    servers: {
      server: {}[]
    }
  }
};

const mavenTemplateObj: MavenSettings = {
  settings: {
    _attributes: {
      'xmlns': 'http://maven.apache.org/SETTINGS/1.0.0',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://maven.apache.org/SETTINGS/1.0.0\n                      http://maven.apache.org/xsd/settings-1.0.0.xsd'
    },
    activeProfiles: {
      activeProfile: 'github'
    },
    profiles: {
      profile: {
        id: 'github',
        repositories: {
          repository: [
            {
              id: 'central',
              name: 'Maven Central Repository',
              url: 'https://repo1.maven.org/maven2',
              releases: {
                enabled: true
              },
              snapshots: {
                enabled: true
              }
            }
          ]
        }
      }
    },
    servers: {
      server: [
      ]
    }
  }
};

(async (): Promise<void> => {
  try {
    let owner: string = core.getInput('owner');
    let repo: string = core.getInput('repo');

    if (!owner || !repo) {
      const repoInfo: string[] = process.env.GITHUB_REPOSITORY!.split('/');

      if (!owner) {
        owner = repoInfo[0];
      }

      if (!repo) {
        repo = repoInfo[1];
      }
    }

    const name: string = repo;
    const url: string = `https://maven.pkg.github.com/${owner}/${repo}`;
    const releaseEnabled: boolean = core.getInput('release-enabled') !== 'false';
    const releaseUpdatePolicy: string = core.getInput('release-update-policy') || 'daily';
    const snapshotsEnabled: boolean = core.getInput('snapshots-enabled') !== 'false';
    const snapshotsUpdatePolicy: string = core.getInput('snapshots-update-policy') || 'daily';

    const serverId: string = repo;
    const serverUsername: string = core.getInput('username');
    const serverPassword: string = core.getInput('password');

    let inputObj: MavenSettings = { ...mavenTemplateObj };

    inputObj.settings.profiles.profile.repositories.repository.push({
      id: repo,
      name: name,
      url: url,
      release: {
        enabled: releaseEnabled,
        updatePolicy: releaseUpdatePolicy
      },
      snapshots: {
        enabled: snapshotsEnabled,
        updatePolicy: snapshotsUpdatePolicy
      }
    });

    inputObj.settings.servers.server.push({
      id: serverId,
      username: serverUsername,
      password: serverPassword
    })

    const outputXml: string = js2xml(inputObj, {
      indentAttributes: true,
      spaces: 2,
      compact: true
    });

    console.log(outputXml.toString());
    await fsPromise.writeFile(path.join(os.homedir(), '.m2', 'settings.xml'), outputXml.toString());

    const npmTemplateStr: string = '@${owner}:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=${serverUsername}';
    await fsPromise.writeFile(path.join(os.homedir(), '.npmrc'), npmTemplateStr);

  } catch (err: any) {
    core.setFailed(err.message);
  }
})();
