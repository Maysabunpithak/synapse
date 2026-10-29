# Synapse mobile

The app is an Expo dashboard for the Express API in `../server`.

History's home-status card checks the Android phone's current Wi-Fi SSID.
Use **Settings → Wi-Fi บ้าน → ตั้ง Wi-Fi นี้เป็นเครือข่ายบ้าน** to save the
currently connected network. Multiple home SSIDs are supported; remove old
ones with the X button. Names persist in the app's private `home-wifi.json`
file and survive app restarts. Expo Go and the installed app keep separate
settings. `EXPO_PUBLIC_HOME_WIFI_SSIDS` provides initial defaults only until
a local list is saved; an explicitly empty list stays empty. Android requires precise
location permission and location services to expose the SSID. The check runs
every five seconds while History or Wi-Fi settings is open in the foreground, including with
Tailscale enabled. Missing permissions or an unreadable SSID show an unknown
status rather than incorrectly reporting away. This card does not invoke
arrival automations or change the server's separate automation-presence flag.
Rebuild the custom Android app after installing the NetInfo dependency.

## Reference UI

The current template takes layout inspiration from
[Digcy's Elegant Smart Home App](https://dribbble.com/shots/27291362-App-Store-Screenshots-Elegant-Smart-Home-App):
large interior photographs, translucent photo labels, rounded control cards,
pill buttons, prominent values and a flat, light bottom navigation bar with thin
outline icons and an orange active-tab marker. It retains
the original Synapse brown, sand, cream, orange and yellow palette.

Home now shows actual device/room counts, working room filters, scene shortcuts
and direct device power switches. Rooms uses the same filter and control cards.
Light controls retain the existing serialized automatic saves, with larger
brightness controls and touch targets. Login, Automation, History, Settings and
AI share the refreshed typography, spacing and card styles. Tab/detail navigation
returns the main scroll position to the top.

`src/RoomVisual.tsx` renders the locally bundled decorative interior photographs;
see `assets/interiors.md` for provenance. These are illustrative room covers,
not live camera views. The prior API, voice, authentication and Tuya pairing
flows remain in use.

The mobile screens include Login, Home with
horizontal scenes, Rooms, a dedicated Smart Light panel, Automation, History,
Settings, and AI. Shared colors live in `src/theme.ts`:

- Light brown: `#BA9A81`
- Dark brown: `#3F2305`
- Muted brown: `rgba(63,35,5,0.60)` (the reference's muted-brown row repeats the yellow hex)
- Orange: `#FFBD76`
- Yellow: `#F9C900`

Choose **Create an account**, enter your name, email, password (8–128 characters),
and password confirmation. A successful registration signs you in. Existing
accounts use **Log In**. **Settings → User Account → Log out** ends the session.
**Continue as guest** is still available.

Accounts are Synapse accounts, separate from Tuya/Smart Life. They are stored on
the API server in ignored `server/data/users.json`, with salted scrypt password
hashes. Back up this file to retain accounts. Session tokens are held in memory
only, expire after 24 hours, and are cleared when the API restarts or the app
reloads. There is no email verification or password-reset flow yet. Account
sessions protect `/auth/me` and logout; the existing shared-home device API and
guest access retain their previous access behavior.

Restart `node server/server.cjs` from the repository root after updating the API.
On a physical phone, configure `EXPO_PUBLIC_API_BASE_URL` to a reachable API
address. Local Expo web can use `http://localhost:4000` for accounts when no URL
is configured. Development CORS includes Expo web on port 8081; add deployed or
LAN browser origins to `ALLOWED_ORIGINS` on the API server.

Tap a light to open its controls. Drag the vertical brightness control, use the
step buttons, or choose Warm/Cold. Changes apply automatically after a short
300 ms pause; releasing the slider sends the final value immediately. Requests
are serialized and rapid changes are combined so the latest setting wins.
The panel shows saving/error status and offers retry on failure. Power changes
cancel queued adjustments and wait for the active adjustment before toggling.
Demo mode only previews these settings. Connected mode sends absolute settings to `POST /light`; restart
the Express API after updating it. Color settings are sent only for advertised
Home Assistant color capabilities. Power controls use the existing switch API.

History reads real server history when connected; sample charts are explicitly
marked in demo mode. Automation shows the server's learning state when connected;
mode changes are only an interactive demo and do not create schedules.
Automation also shows the latest 20 activity records with their action, time,
and source. New mobile taps are recorded as `ui-toggle`; voice and scene commands
include explicit `source` metadata. Restart the API after this change. Older
`switch` entries may include mobile taps, and older command text may come from
voice or scenes; the UI labels these ambiguities instead of rewriting history.
AI uses foreground push-to-talk. Open the assistant, hold the house character for 350 ms, wait for the listening label, then speak. Release to submit one command. A short tap does not open the microphone. Slide outside the house to discard the recording. Leaving AI, losing the gesture, or backgrounding also cancels capture. The bottom assistant tab only navigates and never starts recording. Stopping cannot undo a command already received by the server. The screen shows the recognized words, current state, and spoken result; there is no text-command field or send button.

Held recordings do not submit during pauses in speech. Each recording has a
30-second maximum and is sent once at release or at that limit. Replies do not
automatically reopen the microphone; hold again for the next command. Releasing
while permission or setup is pending cancels the capture, including a permission
grant that arrives later. After granting microphone permission the first time,
hold again. Screen-reader accessibility actions support start/send and cancel.
Expo Speech reads replies aloud in Thai, including demo and error replies, and
playback stops when leaving AI. The assistant never records in the background.

Expo Audio records M4A on Android/iOS; the browser's MediaRecorder records WebM or MP4 and explicitly releases microphone tracks on stop/cancel. Audio goes to `/transcribe` (Groq Whisper, Thai) and only a successful, nonempty transcript proceeds to `/ai/command`. No wake word is required. Demo mode does not execute commands. Microphone permission is requested on the first hold. Leaving AI or backgrounding the app cancels the recording. Web recording needs HTTPS or localhost. `GROQ_API_KEY` must be configured on the server; the key never goes in the app.
Settings preferences are previews for the current session.

The UI is in `src/SynapseUI.tsx`; `App.tsx` retains API state and native Tuya
pairing. SVG icons require rebuilding the custom native app after installing
dependencies. Rebuild the native app for the new Expo Audio module and microphone
permission (`npx expo run:android`, or an updated EAS build). Refreshing an old
installed APK alone cannot add a native recording module. Tuya pairing remains Android-only.

Validation: `npx tsc --noEmit`, `npx expo export --platform all`, and, from the
repository root, `node --test server/auth.test.cjs server/light_control.test.cjs server/transcribe.test.cjs`.
Mobile voice and recording tests: `node --test mobile/tests/*.test.cjs` from the
repository root (Node 24, using its built-in TypeScript support).

The mascot uses `assets/synapse-mascot.png` with gentle floating and swaying.
Motion stops when reduced motion is enabled, the app is inactive, or pairing
hides the dashboard. Generation notes are in `assets/synapse-mascot.md`.

## Configure the API

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS or Tailscale URL that a phone can reach. Do not use `localhost` on a physical phone.

Then run:

```powershell
npm.cmd start
```

Without the environment variable, the dashboard deliberately displays sample devices. No Home Assistant token or AI key belongs in this app.

## Current integration

- `GET /devices` loads live devices.
- `POST /switch/:action` toggles a device.
- `POST /ai/command` invokes the three scene shortcuts.
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, and `POST /auth/logout`
  manage Synapse accounts and sessions.

The microphone uses Expo Audio → `/transcribe` → `/ai/command`. Audio uploads
are limited to 8 MB, use the recording's actual format, and return explicit errors
for missing permissions/configuration, empty speech and provider failures.
Recording integration follows the [Expo Audio SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/sdk/audio/).

## Device pairing

The **Settings → Add a device** flow records the current Home Assistant device list and then checks for a newly discovered device. It provides the in-app pairing entry point and confirmation step.

The custom Android module implements Tuya email sign-in, home selection/creation,
and EZ Wi-Fi pairing. It requires the Tuya Android SDK and a Tuya IoT Platform
project (App Key, App Secret, and the configured app schema). Those credentials
must stay out of the repository. Synapse uses the Home SDK APIs directly rather
than Tuya's Activator UI bundle, because the app provides its own pairing interface.

Device pairing uses an account registered under this app's Tuya SDK configuration.
Tuya Developer, Smart Life, and the Synapse dashboard accounts are separate.
In Add device, choose **ยังไม่มีบัญชี · สมัครที่นี่**, enter an email and a
new password, and press **ส่งรหัสยืนยันทางอีเมล**. Enter the six-digit code
and press **สมัครและไปต่อ**. The app then signs in and loads homes.
Verification email is sent only when the user presses the button; resending is
disabled for 60 seconds after a successful send. Passwords and codes are not
stored by Synapse. Actual registration requires the user to receive the email.

The Thai pairing flow restores the native account session and skips completed
account/home setup. Wi-Fi entry, plug preparation, and pairing occupy separate
screens. `src/PairingCircle.tsx` renders the circular primary action and pairing
status. **ถัดไป** only advances to preparation; **พร้อมแล้ว เริ่มเชื่อมต่อ**
starts EZ pairing after the user confirms fast blinking. Cancellation and errors
return to preparation, with an option to edit Wi-Fi. Home Assistant availability
is checked separately after Tuya reports pairing success.

## Installable Android and iPhone builds

`eas.json` provides two build profiles:

- `preview` creates an installable Android APK and an internally distributed iOS build.
- `production` creates store-ready builds: an Android AAB for Google Play and an iOS build for TestFlight/App Store.

Before the first build, sign in to your Expo account and configure the project:

```powershell
npx eas-cli login
npx eas-cli build:configure
```

To create an Android APK for a physical phone:

```powershell
npx eas-cli build --platform android --profile preview
```

To create an iPhone test build, an active Apple Developer membership and the iPhone's registered UDID are required:

```powershell
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

## Thai holiday calendar

Set CALENDARIFIC_API_KEY in the root server .env (never EXPO_PUBLIC_*), then restart server/server.cjs. Obtain a key at https://calendarific.com/.

The API loads national Thai holidays for the previous, current and next year, caches each year for 24 hours in server/data/thai-holidays.json, and retries failures at most hourly. Bank-only holidays and observances are excluded. Free-plan names can be English.

GET /calendar/context reports Asia/Bangkok date, calendarStatus, dayType, isHoliday and holiday names. /logs/analyze also returns day_context. Without a key, only weekday/weekend classification works; isHoliday remains null. With a configured key but unavailable or expired calendar data, Auto waits for confirmation.

Auto selects matching weekday history or combined weekend/public-holiday history, using both the approved starting dataset and actual user commands. Presence checks, manual-off pause, cooldown and existing minimum evidence still apply. This is calendar context, not a claim that every user takes the day off. Upcoming previews do not carry today's pattern across midnight.
