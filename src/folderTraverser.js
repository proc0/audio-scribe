// folderTraverser.js
// Directory scanning with two backends:
//   1. File System Access API  (Chromium) — live, walk-based, progress callbacks
//   2. <input webkitdirectory>  (all browsers) — browser does the walk for us

const AUDIO_EXTENSIONS = [
  '.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac',
  '.aiff', '.aif', '.wma', '.opus',
];

function isAudioFile(fileName) {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

function toRecord(path, size, lastModified) {
  return { path, size, lastModified: new Date(lastModified) };
}

/**
 * Scan a user-selected folder for audio files.
 * Tries the File System Access API first, falls back to a hidden
 * <input type="file" webkitdirectory> element.
 *
 * @param {Object}  [opts]
 * @param {Function} [opts.onProgress] - called with (path, count) as files are found
 * @param {HTMLInputElement} [opts.fallbackInput] - hidden input used on non-Chromium browsers
 * @returns {Promise<Array<{path: string, size: number, lastModified: Date}>>}
 *          Resolves to [] if the user cancels the picker.
 */
export async function scanFolderForAudio({ onProgress = () => {}, fallbackInput = null } = {}) {
  // --- Backend 1: File System Access API (walk the tree ourselves) ---
  if (typeof window.showDirectoryPicker === 'function') {
    let rootHandle;
    try {
      rootHandle = await window.showDirectoryPicker({ mode: 'read' });
    } catch (err) {
      if (err.name === 'AbortError') return []; // user cancelled
      console.log("HAHAHAHA");
      throw err;
    }

    const results = [];
    const walk = async (handle, currentPath) => {
      for await (const entry of handle.values()) {
        const fullPath = currentPath
          ? `${currentPath}/${entry.name}`
          : entry.name;

        if (entry.kind === 'directory') {
          await walk(entry, fullPath);
        } else if (isAudioFile(entry.name)) {
          const file = await entry.getFile();
          results.push(toRecord(fullPath, file.size, file.lastModified));
          onProgress(fullPath, results.length);
        }
      }
    };

    await walk(rootHandle, '');
    return results;
  }

  // --- Backend 2: webkitdirectory input (universal fallback) ---
  if (!fallbackInput) {
    throw new Error('No supported folder-picking mechanism available.');
  }

  return new Promise((resolve) => {
    let settled = false;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      fallbackInput.removeEventListener('change', handleFiles);
      fallbackInput.removeEventListener('cancel', handleCancel);
      window.removeEventListener('focus', onFocus);
      resolve(result);
    };

    // Firing when the user confirms the picker.
    const handleFiles = (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        settle([]);
        return;
      }
      const results = [];
      for (const file of files) {
        if (isAudioFile(file.name)) {
          results.push(toRecord(file.webkitRelativePath, file.size, file.lastModified));
          onProgress(file.webkitRelativePath, results.length);
        }
      }
      settle(results);
    };

    // Modern browsers fire 'cancel' when the dialog is dismissed.
    const handleCancel = () => settle([]);

    // Legacy fallback for cancel: the window regaining focus means the
    // native dialog closed. But we must give 'change' a grace period,
    // because on CONFIRM the dialog also closes and focus fires first —
    // only if no files have arrived by the deadline do we call it a cancel.
    const onCancelGraceMs = 1200;
    const onFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!fallbackInput.files || fallbackInput.files.length === 0)) {
          settle([]);
        }
      }, onCancelGraceMs);
    };

    fallbackInput.addEventListener('change', handleFiles);
    fallbackInput.addEventListener('cancel', handleCancel);
    // Defer focus listener so the initial dialog open doesn't count.
    window.setTimeout(() => window.addEventListener('focus', onFocus), 0);

    fallbackInput.value = ''; // allow re-selecting the same folder
    fallbackInput.click();
  });
}
