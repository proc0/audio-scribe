import {
  STATE_CHECKING,
  STATE_DEFAULT,
  STATE_ERROR,
  FilePickerAPI,
} from './const'
import { AudioScribe } from './audio-scribe'

(async () => {
  let initState = STATE_CHECKING;
  let initMessage = "";
  let fileAcessAPI = FilePickerAPI.NONE;

  if ('gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();

      if (adapter) {
        const vendor = adapter.info?.vendor ? `(${adapter.info?.vendor})` : '';
        initMessage = `WebGPU adapter found. ${vendor}`
      } else {
        initMessage = 'WebGPU adapter not found! Using CPU. Check browser GPU settings, i.e. chrome://gpu for WebGPU status.'
      }
      
      initState = STATE_DEFAULT

    } catch (error) {
      initMessage = `Error checking WebGPU status. ${error.message}.`
      
      initState = STATE_ERROR
    }
  } else {    
    initState = STATE_ERROR
    initMessage = 'WebGPU adapter not found. Using CPU (WASM). Check browser GPU settings, i.e. chrome://flags/#enable-unsafe-webgpu'
  }

  // check which file picker type the browser supports
  if (initState === STATE_DEFAULT) {    
    if (window.showDirectoryPicker && typeof window.showDirectoryPicker === 'function') {
      // File System Access is supported by Chromium browsers
      fileAcessAPI = FilePickerAPI.FSA
    } else if (navigator?.storage && 'getDirectory' in navigator.storage) {
      // Origin Private File System is supported by most other browsers
      fileAcessAPI = FilePickerAPI.OPFS
    } else {
      // abort if no available file picker in browser
      initState = STATE_ERROR 
      initMessage = 'No available file or folder access in this browser.'
    }
  }

  const initialize = () => {
    AudioScribe.prototype.update.bind({ infoOpened: true })(initState, initMessage)
    
    if (initState === STATE_ERROR) return

    window.AudioScribe = new AudioScribe(fileAcessAPI)
  }

  if (document.readyState === 'complete') {
    initialize()
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})();
