// main.js
import { scanFolderForAudio } from './folderTraverser.js';

const btn = document.getElementById('scan-btn');
const btnLabel = document.getElementById('btn-label');
const status = document.getElementById('status');
const countEl = document.getElementById('count');
const listEl = document.getElementById('file-list');
const fallbackInput = document.getElementById('dir-fallback');

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function handleScan() {
  btn.disabled = true;
  btnLabel.textContent = 'Scanning…';
  status.textContent = '';
  listEl.innerHTML = '';
  countEl.textContent = '';

  const files = await scanFolderForAudio({
    fallbackInput,
    onProgress: (path, n) => {
      status.textContent = `${n} found · ${path}`;
    },
  });

  if (files.length === 0) {
    listEl.innerHTML = '<li class="empty">No audio files found in that folder.</li>';
  } else {
    const frag = document.createDocumentFragment();
    for (const f of files) {
      const li = document.createElement('li');
      li.textContent = f.path;
      li.title = `${formatSize(f.size)} · modified ${f.lastModified.toLocaleDateString()}`;
      frag.appendChild(li);
    }
    listEl.appendChild(frag);
  }

  countEl.textContent = files.length
    ? `${files.length} audio file${files.length === 1 ? '' : 's'} found`
    : '';
  status.textContent = '';
  btn.disabled = false;
  btnLabel.textContent = 'Scan another folder';
}

btn.addEventListener('click', handleScan);

// Honest capability reporting instead of hard-disabling
if (typeof window.showDirectoryPicker !== 'function' && !('webkitdirectory' in HTMLInputElement.prototype)) {
  btn.disabled = true;
  btnLabel.textContent = 'Not supported';
  status.textContent = 'This browser can\'t pick folders.';
}
