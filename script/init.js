import {
  STATE_DEFAULT,
  STATE_CHECKING,
  STATE_LOADING,
  STATE_CLEARING,
  STATE_READY,
  STATE_ERROR,
  FilePickerAPI,
} from './const'
import { initialize, updateAppState } from './main'

// check WebGPU availability
(async () => {
  if (!navigator.gpu) {
    updateAppState(STATE_CHECKING, 'WebGPU not available! Using CPU (WASM). For GPU acceleration, enable chrome://flags/#enable-unsafe-webgpu');
    return;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      updateAppState(STATE_CHECKING, 'WebGPU adapter not found! Using CPU. Check chrome://gpu for WebGPU status.');
      return;
    }

    const info = adapter.info || {};
    const desc = info.description || info.vendor || info.architecture || 'Available';
    updateAppState(STATE_CHECKING, `WebGPU support found (${desc}).`);
  } catch (e) {
    updateAppState(STATE_ERROR, `Error checking WebGPU status: ${e.message}.`);
  }
})();

// check which file picker type the browser supports
let filePickerType = FilePickerAPI.NONE
if (window.showDirectoryPicker && typeof window.showDirectoryPicker === 'function') {
  // File System Access is supported by Chromium browsers
  filePickerType = FilePickerAPI.FSA
} else if (navigator?.storage && 'getDirectory' in navigator.storage) {
  // Origin Private File System is supported by most other browsers
  filePickerType = FilePickerAPI.OPFS
}

initialize(filePickerType)
