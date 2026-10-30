# Metta Map Changelog Rules & Assistant Change-Logging Protocol

## Mandatory Rule for AI Studio Assistant and Developers
Whenever any code change, feature, fix, or update is made to this project and a response is provided:

1. **Log Your Change in the Map Changelog**:
   - A new changelog item must be added to the Changelog with:
     - `version`: Current version or appropriately bumped semantic version (e.g., `1.2.2`).
     - `date`: Current date in ISO format `YYYY-MM-DD` (e.g., `2026-10-29`).
     - `title`: Concise, descriptive headline of the enhancement.
     - `description`: Optional overview of the changes.
     - `tag`: One of `'feature' | 'fix' | 'update' | 'release' | 'ecosystem' | 'ui'`.
     - `author`: `'AI Studio Assistant'` (or contributor name).
     - `changes`: An array of clear bullet points detailing all changes made.
     - `source`: `'manual'`.

2. **Automatic Persistence to Cloud Firestore**:
   - The changelog entry must be saved in `DEFAULT_CHANGELOG_CONFIG` in `src/utils/githubSync.ts`.
   - On runtime boot and on commit, the changelog is automatically synced to Firestore under `ecosystem/changelog_config` so changes persist across all devices, browser sessions, and users.
   - Use the `persistChangelogConfigToFirestore` function or `recordAssistantChangelogEntry` helper to ensure the change is saved immediately to the cloud.

3. **User Manual Commit Support**:
   - When users edit, add, or delete changelog entries in the Map Changelog modal, the UI identifies the uncommitted changes and displays an interactive **"Commit to Cloud"** button.
   - Clicking this button writes the updated changelog configuration directly to Cloud Firestore.
