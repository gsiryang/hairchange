# AI hairstyle test — 2026-09-24

Tool: built-in image_gen. Each variant was independently generated from `../public-test/portrait.jpg`; no CLI or paid video provider was configured.

Source attribution and public-domain statement: [SOURCE.md](../public-test/SOURCE.md).

## Shared prompt (verbatim)

Use case: identity-preserve. Edit target: the provided public-domain official portrait, used solely as a labeled hairstyle test. Change ONLY scalp hair. Preserve exact identity, facial proportions, skin texture and age, eyebrows, ears, smile and teeth, head pose, camera framing, background, suit, hands and lighting. Do not beautify, de-age, reshape jaw or alter expression. Same full portrait composition and aspect ratio as input. Photorealistic natural hair with plausible hairline. No text or graphics. Hairstyle: 

## Appended variant prompts (verbatim)

- crop.png: A fuller short tightly curled salt-and-pepper hairstyle, about 3 cm on top with softly tapered sides, clearly fuller than the original close crop.
- part.png: A realistic salt-and-pepper side-part hairstyle with a clearly defined part and 6 cm softly waved top combed sideways, close tapered sides. Distinct silhouette from a curly crop. Keep face and pose unchanged.
- curls.png: Medium-length salt-and-pepper natural curls, soft rounded silhouette, curls reach just over the upper ears with 9 cm volume on top, restrained and believable rather than exaggerated. Clearly longer than the other short styles. Keep original face, age, expression, camera framing and head position exactly.

## Review

Outputs inspected visually in conversation: recognizably the same subject, similar frontal smile, clothing, background and framing. This is a qualitative review, not proof of unchanged facial geometry or identity accuracy. No side-view reference or generated video exists. The third variant did not fully follow the requested longer length; UI labels it fuller curls instead. Prompt lengths in centimeters are creative directions, not calibrated physical measurements.

These PNGs are pre-generated test assets. The static web page only switches assets; it does not call a generation service. No live photo upload, generation job, side-view synthesis or adjustable-length generation is implemented. Video tools were searched in the available tool catalog; none were available. No slideshow or simulated progress substitutes for video.
