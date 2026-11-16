import {
  STATE_CHECKING,
  STATE_DEFAULT,
  STATE_ERROR,
  FileSystemType,
} from './const'
import { AudioScribe } from './audio-scribe'

// DONE: add a clear button for clearing audio files
// DONE: add an input element for the filename in output tab
// TODO: add welcome screen that disappears when adding first files that shows what it is and what to do
// NOPE: add footer link references
// NOPE: move info to bottom make it look like terminal
// DONE: make audio player show only when pressing play
// TODO: add README details, getting started, references etc.
// TODO: build to compressed chunks with Vite
// TODO: publish website
// LAB: add a side-by-side option to see input and output tab side by side
// LAB: add popup on transcribe button when it's disabled because there is no audio model loaded

(async () => {
  let initState = STATE_CHECKING;
  let initMessage = "";

  // check WebGPU availability
  if ('gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const vendor = adapter.info?.vendor ? `(${adapter.info?.vendor})` : '';
        initMessage = `WebGPU adapter found. ${vendor}`
      } else {
        initMessage = 'WebGPU adapter not found. Using CPU. Check browser GPU settings, i.e. chrome://gpu for WebGPU status.'
      }
      initState = STATE_DEFAULT
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      initMessage = `Error checking WebGPU status. ${message}.`
      initState = STATE_ERROR
    }
  } else {    
    initState = STATE_ERROR
    initMessage = 'WebGPU adapter not found. Using CPU (WASM). Check browser GPU settings, i.e. chrome://flags/#enable-unsafe-webgpu'
  }

  let fileAPI = FileSystemType.NONE;
  // check which file picker type the browser supports
  if (initState === STATE_DEFAULT) {    
    if (window.showDirectoryPicker && typeof window.showDirectoryPicker === 'function') {
      // File System Access is supported by Chromium browsers
      fileAPI = FileSystemType.FSA
    } else if (navigator?.storage && 'getDirectory' in navigator.storage) {
      // Origin Private File System is supported by most other browsers
      fileAPI = FileSystemType.OPFS
    } else {
      // abort if no available file picker in browser
      initState = STATE_ERROR 
      initMessage = 'No available file or folder access in this browser.'
    }
  }

  const initialize = () => {
    // expose initial app state to user in case it is an error
    AudioScribe.prototype.update.bind({ infoOpened: true })(initState, initMessage)
    
    if (initState === STATE_ERROR) return;

    window.AudioScribe = new AudioScribe(fileAPI)
  }

  // check for DOM load before init
  if (document.readyState === 'complete') {
    initialize()
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})();
