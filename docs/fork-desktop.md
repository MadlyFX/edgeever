# Desktop builds for this fork

Open **Actions → Build fork desktop → Run workflow** in `MadlyFX/edgeever`.
Select the branch to build. Pull requests from branches in this repository and
changes pushed to `main` also build automatically;
the upstream updater's completed workflow triggers a build of the new `main`
tip, including when its bot push cannot trigger another push workflow.

When the run succeeds, download the `edgeever-fork-windows-x64-*` artifact.
Extract it and run the Windows x64 `.exe` installer. `BUILD.txt` records the
source commit and `SHA256SUMS.txt` records the installer digest. Artifacts are
retained for 30 days. These personal builds are unsigned and require no signing
secrets. macOS and Linux packages continue to use the upstream release workflow.

Fork builds use `electron-builder.fork.yml` and a packaged manual update policy.
They do not bundle the official update feed or run its automatic updater.
**Settings → System information → Download latest** opens this fork's build
workflow; download and install a newer artifact to upgrade. The workflow checks
package contents, update isolation, and packaged startup. Installation over an
existing user profile and cross-version upgrades must be verified with actual
packages before claiming compatibility. Keep a backup before replacing an
installed app. Returning to an official installer restores its update policy.

## Personal branding

Open **Settings → Preferences → Branding**. Set the app name, accent color,
and either a logo URL or an uploaded PNG, JPEG, or WebP (up to 256 KB). Preview
the result, then save. Reset branding restores the defaults.

Preferences are stored in the current browser or desktop profile on this device;
other tabs and note windows receive changes immediately. They personalize the
workspace, sign-in screen, browser title/favicon, and note window/print titles.
Remote HTTPS logos are fetched from their host; uploaded logos stay in local
preferences. Public share pages, native installer identity, and the installed
PWA name/icon keep their existing branding. No rebuild or server migration is
needed. Clearing browser data also clears these preferences.
