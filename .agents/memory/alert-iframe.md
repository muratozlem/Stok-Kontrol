---
name: Alert.alert blocked in iframe
description: React Native Alert.alert silently fails in browser iframes — use inline UI
---

`Alert.alert()` in React Native Web calls `window.confirm()` / `window.alert()`. Modern browsers silently block these dialogs when the page runs inside an iframe (Replit preview, embedded apps).

**Symptom:** Buttons that call `Alert.alert` do nothing when clicked in the preview pane.

**Fix:** Replace all `Alert.alert` confirmation dialogs with inline state-based UI:
1. Add a `useState` (e.g. `confirmDeleteId`, `confirmClearAll`) in the component.
2. First button click → set state to show inline confirm UI.
3. Render "İptal" and "Evet, [action]" buttons inside the card/section.
4. "İptal" → reset state; confirm button → call the mutation.

**How to apply:** Never use `Alert.alert` for confirmations in this app. For errors that were shown via `Alert.alert`, use a local error state or toast instead.
