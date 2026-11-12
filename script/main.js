import {
  STATE_CHECKING,
  STATE_READY,
  STATE_ERROR,
  FilePickerAPI,
} from './const'
// import { initialize, updateAppState } from './main'
import { AudioScribe } from './audio-scribe'

(async () => {
  let initState = STATE_CHECKING;
  let stateMessage = "";
  let filePickerType = FilePickerAPI.NONE;

  if (!navigator.gpu) {
    initState = STATE_ERROR
    stateMessage = 'WebGPU not available! Using CPU (WASM). For GPU acceleration, enable chrome://flags/#enable-unsafe-webgpu'
  } else {    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        initState = STATE_READY
        stateMessage = 'WebGPU adapter not found! Using CPU. Check chrome://gpu for WebGPU status.'
      } else {
        const info = adapter.info || {};
        const desc = info.description || info.vendor || info.architecture || 'Available';

        initState = STATE_READY
        stateMessage = `WebGPU support found (${desc}).`
      }
    } catch (error) {
      initState = STATE_ERROR
      stateMessage = `Error checking WebGPU status: ${error.message}.`
    }
  }

  // check which file picker type the browser supports
  if (initState === STATE_READY) {    
    if (window.showDirectoryPicker && typeof window.showDirectoryPicker === 'function') {
      // File System Access is supported by Chromium browsers
      filePickerType = FilePickerAPI.FSA
    } else if (navigator?.storage && 'getDirectory' in navigator.storage) {
      // Origin Private File System is supported by most other browsers
      filePickerType = FilePickerAPI.OPFS
    } else {
      // abort if no available file picker in browser
      initState = STATE_ERROR 
      stateMessage = 'No available file or folder access in this browser.'
      // throw new Error(stateMessage)
    }
  }

  const initialize = () => {
    // TODO: expose error message to user without instatiating app
    if (initState === STATE_ERROR) throw Error(stateMessage)

    window.AudioScribe = new AudioScribe(filePickerType)
    window.AudioScribe.update(initState, stateMessage)
  }

  if (document.readyState === 'complete') {
    initialize()
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})();
