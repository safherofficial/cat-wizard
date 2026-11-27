# WebGL browser build

Cat Wizard has a browser build path based on the existing Unity project. The build uses the pinned Unity editor version from `ProjectSettings/ProjectVersion.txt`, a custom responsive browser page, Gzip compression with Unity's decompression fallback, and a GitHub Pages deployment workflow.

## What happens automatically

A push to `main`, or a manual run of **Cat Wizard WebGL** from the Actions tab, starts a Unity WebGL build. The workflow:

1. Checks out the project and restores the Unity `Library` cache.
2. Builds the enabled scene list for WebGL using GameCI and the exact Unity version pinned in the repository.
3. Verifies that the generated `index.html` and WebGL build payload exist.
4. Uploads a downloadable `cat-wizard-webgl` artifact for 14 days.
5. Packages the same player for GitHub Pages and deploys it from `main`.

The intended public URL is:

`https://safherofficial.github.io/cat-wizard/`

The first deployment requires GitHub Pages to be configured with **Settings → Pages → Build and deployment → Source → GitHub Actions**. The workflow deliberately does not attempt to enable Pages with a repository secret or personal access token.

## Unity license secrets

GitHub Actions cannot build the Unity player until a valid Unity license is available to the runner. Add the values under **Repository → Settings → Secrets and variables → Actions**. Never commit these credentials or paste them into an issue, chat, or source file.

### Unity Personal

Use the free Personal license workflow:

- `UNITY_LICENSE`: the complete contents of the locally activated `.ulf` license file.
- `UNITY_EMAIL`: the email address used for the Unity account.
- `UNITY_PASSWORD`: the Unity account password.

In Unity Hub, activate the Personal license under Preferences → Licenses, then locate the license file:

- Windows: `C:\ProgramData\Unity\Unity_lic.ulf`
- macOS: `/Library/Application Support/Unity/Unity_lic.ulf`
- Linux: `~/.local/share/unity3d/Unity/Unity_lic.ulf`

### Unity Professional

For a paid Unity license, use:

- `UNITY_EMAIL`
- `UNITY_PASSWORD`
- `UNITY_SERIAL`

Do not use the Personal-license `UNITY_LICENSE` setup for a Professional license. The workflow passes all four variables to GameCI, so the unused license-type variable can remain unset.

## Running and testing

After configuring the license secrets and GitHub Pages source:

1. Open the repository's **Actions** tab.
2. Select **Cat Wizard WebGL**.
3. Run the workflow on `main`, or push a new commit to `main`.
4. Wait for the build job and the Pages deployment job to finish.
5. Open the published URL shown by the deployment job.

The build artifact can also be downloaded from the workflow run as `cat-wizard-webgl` and served from a static web server.

## Browser build constraints

- The build is single-threaded; it does not require cross-origin isolation headers such as COOP/COEP.
- Gzip plus decompression fallback is selected so static hosting does not depend on custom `Content-Encoding` response headers.
- The HTML shell supports responsive desktop and mobile layouts. The current gameplay scene still needs hands-on browser testing for keyboard, mouse, touchscreen, memory use, and performance.
- WebGL is not considered verified until a complete Unity build succeeds and the published build is opened and played in a real browser.
