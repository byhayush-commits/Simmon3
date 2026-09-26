# Lock-screen / notification skip-next & skip-previous + progress bar — Android patch (v3)

4 files. Copy them into your repo at the SAME paths, overwriting what's there.
patches/expo-audio+57.0.5.patch NOW INCLUDES all three sessions' changes — this is
the complete, current patch. Don't try to stack an old copy with a new one.

- patches/expo-audio+57.0.5.patch   → NEW file, put in a `patches/` folder at repo root
- package.json                       → only added: devDependency `patch-package`
                                        + `"postinstall": "patch-package"` script
- src/playback/PlaybackEngine.ts     → 3 small additions
- src/hooks/usePlayer.tsx            → 2 new lines

## Session 1 recap — what was already in the patch

expo-audio's own native session code (`AudioMediaSessionCallback.kt`) deliberately
removes track-navigation from the media session on connect, and only ever built
two custom buttons: seek ±10s. This part of the patch: stop removing the 4
navigation commands, and wrap the session player in a `ForwardingPlayer` that
reports a fake next/previous item and turns a press into a `player.emit(...)`
event, caught in `PlaybackEngine.ts` → `usePlayer.tsx` → your existing
`next()`/`previous()`. This alone does NOT change what the notification looks
like — it only makes next/prev available at the command level.

## Session 2 (today) — the actual icon swap

`updateSessionCustomLayout()` in `AudioControlsService.kt` was still building
the ⏪10/⏩10 buttons you saw in every screenshot — that's what actually draws
the notification row, separate from the "is this command allowed" question
session 1 fixed. Today's change: replaces those two buttons outright —
`ICON_SKIP_BACK_10` + custom seek command → `ICON_PREVIOUS` +
`Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM`, same for forward/next. Same two
slots, always shown (no longer gated behind the old `showSeekBackward`/
`showSeekForward` options). **The ±10s seek buttons are gone from the lock
screen/notification entirely after this — there is no third slot, this is a
replacement, not an addition.**

Also added: a TEMPORARY diagnostic log in `onPlaybackStateChanged` —
`Log.d("AurixDurationCheck", "duration=... unset=...")` — fires once per
track when it reaches `STATE_READY`. This is NOT a progress-bar fix. Run a
build, play a few different tracks, `adb logcat -s AurixDurationCheck`, and
send me what it prints. If duration is a real number, the missing progress
bar is a fixable notification bug. If it prints the unset value
(-9223372036854775807), the bar can never show no matter what we patch here —
the problem is upstream in however your stream URLs get resolved, and that's
a completely different file to go fix. Remove this Log.d line once you have
your answer; it's not meant to ship.

## Session 3 (today) — the actual progress-bar fix, no logcat needed

New information changed the plan: `DownloadService.ts` names files `.m4a` —
your tracks are AAC-in-MP4, a format that carries its own duration in the
container header. That made "duration is genuinely unknown" the unlikely
explanation, so instead of diagnosing first, I found and fixed a concrete gap.

Root cause: `MetadataInjectingPlayer.kt`'s `getMediaMetadata()" builds the
`MediaMetadata` object the OS notification/lock-screen/Android Auto read for
duration — and it only ever set title/artist/album/artwork, NEVER duration.
`MediaMetadata.durationMs` is a separate, statically-set field from
`Player.getDuration()` (the live playback duration ExoPlayer tracks
internally) — nothing in this file ever bridged the two, so the field the OS
actually reads for the progress bar was permanently null regardless of
whether ExoPlayer itself knew the real duration.

Fix: `getMediaMetadata()` now reads `super.getDuration()` and injects it as
`.setDurationMs(...)`, left null only while the player is still
loading/buffering (`C.TIME_UNSET`) so no fake duration shows during that
window. This is additive — nothing removed, nothing else changed in this file.

**Residual risk, being upfront about it:** this fixes the field itself, but
I could not fully verify whether Media3's session automatically re-notifies
the OS the moment duration transitions from "unknown" to "known" mid-load
(vs. only re-reading it on the next natural event, e.g. play/pause). If the
bar appears but only updates a beat late, or needs one skip/pause to "wake
up," that's the mechanism to come back and harden next — not a sign the root
cause was wrong.

The `Log.d("AurixDurationCheck", ...)` line from session 2 is still in
`AudioControlsService.kt` — harmless, still useful if you ever do get access
to a computer for `adb logcat` and want to confirm the duration number
directly instead of just observing the bar.



That library builds its OWN separate foreground media session next to
expo-audio's `AudioControlsService`, which is also a foreground media session.
Two foreground media sessions fighting over the same notification/session is
the textbook Android crash you hit. This patch edits expo-audio's session in
place instead of adding a second one — no new native dependency at all.

## One thing I could not verify offline

`CommandButton.ICON_PREVIOUS` / `CommandButton.ICON_NEXT` — I'm confident
these constants exist (media3's own naming convention, same pattern as the
`ICON_SKIP_BACK_10`/`ICON_SKIP_FORWARD_10` this replaces), but I could not
compile against the real `androidx.media3:media3-session` jar in this
environment (no Google Maven access here) to confirm the exact names. If the
build fails on those two lines specifically, that's why — Android Studio/your
build log will show the real available constant names in the error, swap
them in, nothing else in the patch is affected.

## Apply it

1. Copy `patches/expo-audio+57.0.5.patch` into `patches/` at your repo root —
   this REPLACES any earlier copy you may have from before.
2. Merge the `package.json` change (devDependency + postinstall script) into
   your real `package.json` — don't just overwrite the whole file, you have
   other deps in yours already.
3. Overwrite `src/playback/PlaybackEngine.ts` and `src/hooks/usePlayer.tsx`
   with the versions here (unchanged since session 1, included for completeness).
4. `npm install`.
5. This needs a native rebuild — `expo prebuild --clean` then a fresh
   EAS/dev build. A JS-only OTA update will NOT pick this up.
6. Check the real lock screen / notification tray, not your in-app Now
   Playing screen — that screen was never affected by any of this.

## Your package-lock.json question (still applies)

`npm install` will touch `package-lock.json` once, only because of the new
`patch-package` devDependency — expected, commit it. Don't overwrite your
existing `package.json` wholesale. Later plain `npm install` runs won't
touch the lockfile further.

One real risk to know about: if `expo-audio` ever gets bumped to a version
other than `57.0.5`, this exact patch file will likely fail to apply —
`npm install` will hard-error instead of silently skipping it. If that
happens, re-diff the Kotlin files by hand against the new version and
regenerate with `npx patch-package expo-audio`.

## Not done

- iOS: separate Swift codebase, not touched, as asked.
- Not compiled against a real Gradle/Android build in this environment (no
  Android SDK / no Google Maven access here) — verified by reading the
  actual expo-audio and expo-modules-core source, not guessed.
- Progress-bar fix is code-complete but unverified on-device (see Session 3's
  "residual risk" note above) — this is the one to actually test with your
  eyes on a real lock screen, not assume works from the diff alone.

