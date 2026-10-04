# Public-domain portrait test fixture

- Work: President Barack Obama.jpg, official portrait, 6 December 2012.
- Photographer: Pete Souza, official White House photograph.
- Source record: https://commons.wikimedia.org/wiki/File:President_Barack_Obama.jpg
- Original image: https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg
- Rights statement checked 2026-09-24: the file page marks the photograph as public domain as a work made by a U.S. federal employee in official duties (PD-USGov-POTUS). It is not described here as a CC0 license.
- Use in this project: technical face reconstruction fixture, not a customer, review, commercial spokesperson or endorsement.
- Original photograph retained unchanged. Generated face.json is a single-image geometric estimate; no ground-truth scan is available.
- Limitation: frontal smiling portrait only. No matching side/rear capture; teeth expression and existing short hair complicate a neutral full-head reconstruction. This fixture cannot establish side-view accuracy or complete scalp recovery.

Reproduce from repository root (MediaPipe dependencies required):

    python build_reference_mesh.py --source docs/assets/public-test/portrait.jpg --output docs/assets/public-test/face.json --provenance "Pete Souza / White House, public-domain portrait; see SOURCE.md"

On Windows use FAJIAN_RUNTIME for the ASCII-path MediaPipe dependency directory if necessary.
