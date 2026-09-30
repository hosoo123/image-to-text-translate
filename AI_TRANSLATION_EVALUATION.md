# AI translation quality check

Use the same dialogue examples with Gemini and Groq. Keep the source lines,
scene, and character notes identical when comparing providers. Natural
Mongolian variants are acceptable; do not require an exact match to the sample.

## Examples

| Source | Scene / voice | A natural result should |
| --- | --- | --- |
| `Okay. You're on.` | Accepting a challenge | Sound short and confident. Example: `За, тохирлоо.` |
| `It'll go back in when you loosen your grip!` | Explaining how to handle an object | Sound like spoken advice. Example: `Атгалтаа суллавал буцаад орчихно!` |
| `I thought about what you said before, and I made it!` | Friendly, pleased | Keep the causal meaning and sound casual. Example: `Өмнө хэлснийг чинь бодож үзээд, хийчихлээ!` |
| `L-Leo?! Why would you?!` | Startled and upset; stutters | Keep the stutter and shock without adding a new accusation. Example: `Л-Лео?! Чи яах гэж тэгсэн юм бэ?!` |
| `Uh, I don't think--` | Hesitant; the speaker is interrupted | Keep the unfinished thought. Example: `Өө, би тэгж бодохгүй байна—` |
| `Don't look at me.` | Embarrassed, speaking to a close friend | Sound shy and informal, not like a command from a superior. Example: `Над руу битгий хараач.` |

## Score each provider

Give each response 0, 1, or 2 for each item:

- Meaning: preserves the source intent and details.
- Mongolian flow: sounds like something a Mongolian speaker would say aloud.
- Voice: reflects the supplied emotion and relationship without overacting.
- Brevity: fits a speech bubble and avoids filler or explanation.

Maximum: 8 per line. Any invented meaning, missing IDs, malformed JSON, or
translated narration/SFX is a failure regardless of score. Record outputs and
scores before changing the prompt so later edits can be compared fairly.

## Manual workflow

1. Send each example through the same translation route and save the output.
2. Test Gemini and Groq separately by setting `AI_PROVIDERS` to one provider at
   a time in the deployment environment, then redeploy.
3. Restore the normal fallback order after comparing results.
4. Revise the prompt only when an example reveals a specific problem; rerun all
   examples after each prompt change.
