# Lock-screen / notification skip-next & skip-previous — Android patch

4 files. Copy them into your repo at the SAME paths, overwriting what's there.

- patches/expo-audio+57.0.5.patch   → NEW file, put in a `patches/` folder at repo root
- package.json                       → only added: devDependency `patch-package`
                                        + `"postinstall": "patch-package"` script
- src/playback/PlaybackEngine.ts     → 3 small additions
- src/hooks/usePlayer.tsx            → 2 new lines

## What was actually broken

expo-audio's own native session code (`AudioMediaSessionCallback.kt`) deliberately
removes track-navigation from the media session on connect, and only ever builds
two custom buttons: seek ±10s. Next/previous were never wired to anything —
not a bug, just out of scope for that library. No JS setting can turn it back on.

## What the patch does (Android only, as asked)

1. `AudioMediaSessionCallback.kt` — stop removing the 4 navigation commands, so
   Android/lock-screen/notification/Bluetooth/Android Auto all see real
   skip-next/skip-previous buttons again instead of nothing.
2. `AudioControlsService.kt` — your queue lives in JS, so the native player has
   no real "next item" to go to. Wraps the player in a `ForwardingPlayer` that
   always reports `hasNextMediaItem() = true` / `hasPreviousMediaItem() = true`
   (so the OS never greys the button out) and, when pressed, does NOT touch
   ExoPlayer directly — it calls `player.emit("remoteNext" | "remotePrevious")`,
   the same `emit()` mechanism expo-audio already uses internally for its
   audio-sample event. This reaches JS with no extra native registration needed.
3. `PlaybackEngine.ts` — subscribes to those two new events on the player and
   surfaces them as `onRemoteNext` / `onRemotePrevious` on the engine, cleaned
   up in `release()` alongside the existing status subscription.
4. `usePlayer.tsx` — calls your existing `next()` / `previous()` when those fire.
   That's it — queue logic, related-track extension, everything else you
   already have just runs, exactly like a manual next/prev tap.

## Why not react-native-playback-controls

That library builds its OWN separate foreground media session next to
expo-audio's `AudioControlsService`, which is also a foreground media session.
Two foreground media sessions fighting over the same notification/session is
the textbook Android crash you hit. This patch edits expo-audio's session in
place instead of adding a second one — no new native dependency at all.

## Apply it

1. Copy `patches/expo-audio+57.0.5.patch` into `patches/` at your repo root.
2. Merge the `package.json` change (devDependency + postinstall script) into
   your real `package.json` — don't just overwrite the whole file, you have
   other deps in yours already.
3. Overwrite `src/playback/PlaybackEngine.ts` and `src/hooks/usePlayer.tsx`
   with the versions here.
4. `npm install` (see note below on package-lock).
5. This needs a native rebuild — `expo prebuild --clean` then a fresh
   EAS/dev build. A JS-only OTA update will NOT pick this up, since the
   changed code is Kotlin inside the Android project, not your JS bundle.

## Your package-lock.json question

`npm install` on your phone/Codespace WILL touch `package-lock.json` — but
only once, and only because you're adding one new devDependency
(`patch-package`) that wasn't there before. That's expected and correct,
commit it. Just don't overwrite your existing `package.json` wholesale — you'd
lose your other dependencies. Add only the two lines shown above.

After that first install, running `npm install` again later (with nothing new
added) won't touch the lockfile further — patch-package's `postinstall` just
re-applies the patch to `node_modules/expo-audio` every time, it doesn't
touch the lockfile itself.

One real risk to know about: if `expo-audio` ever gets bumped to a version
other than `57.0.5` (yours or a future Expo SDK upgrade), this exact patch
file will likely fail to apply — `npm install` will hard-error instead of
silently skipping it. That's patch-package being loud on purpose. If that
happens, re-diff the two Kotlin files by hand against the new version and
regenerate with `npx patch-package expo-audio`.

## Not done

- iOS: separate Swift codebase, not touched, as asked.
- I could not verify this against a real Gradle/Android build in this
  environment (no Android SDK / no Google Maven access here) — the Kotlin is
  API-verified against expo-audio's and expo-modules-core's actual source
  (ForwardingPlayer overrides and SharedObject.emit both confirmed to exist
  with these exact signatures), but you should still watch the first real
  build's logcat for anything I couldn't catch by reading alone.
