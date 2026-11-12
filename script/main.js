import { 
  AudioModel,
  loadAudioFile,
  clearModelCache,
  getCacheInfo 
} from './audio-model'

import { 
  OPFSPicker, 
  FSAPicker
} from './audio-picker'
import {
  AudioFile
} from './audio-file'
import {
  STATE_DEFAULT,
  STATE_CHECKING,
  STATE_LOADING,
  STATE_CLEARING,
  STATE_READY,
  STATE_ERROR,
  AppState,
  PICKER_NONE,
  PICKER_FSA,
  MODELS,
  DEFAULT_MODEL,
} from './const'


// TODO: refactor and cleanup class names
// TODO: refactor our all text into index.html templates or something

let appState = STATE_DEFAULT
let transcribeFiles = []

let audioModel = null
// let audioModel = {
//   dispose: () => { console.log('DISPOSING') },
//   load: async (path, config) => {
//     for (let i = 0; i < 10; i++) {
//       const mockProg = { file: `file_${i}`, status: i < 9 ? 'loading' : 'done', progress: i*10 }
//       await new Promise(resolve => setTimeout(() => { config.progressCallback(mockProg); resolve(); }, 400))
//     }
//   }
// }

export function updateAppState(state, message, memo) {
  let lastState = appState
  appState = state

  const infoDetails = document.getElementById('info')
  const infoBody = infoDetails.querySelector('p')

  if (state === STATE_ERROR) {
    console.error(message);
  } else {
    console.log(message);
  }

  infoBody.textContent = message

  if (state == STATE_DEFAULT) {

  } else if (state === STATE_LOADING) {
    const loadingBar = document.getElementById('loading-bar')

    if (lastState != appState) {
      loadingBar.value = 0
      loadingBar.setAttribute('style', 'visibility: visible')
      infoDetails.open = true
    }

    if (memo?.status === 'loading') {      
      loadingBar.value = memo.progress
    } else if (memo?.status === 'done') {
      loadingBar.value = 100
      setTimeout(() => { 
        loadingBar.removeAttribute('style')
      }, 1000)
    }

  } else if (state === STATE_CHECKING) {
    infoDetails.open = true

  } else if (state === STATE_CLEARING) {
    infoDetails.open = true

  } else if (state === STATE_READY) {

  }
}

async function getCacheSize() {
  const info = await getCacheInfo()
  const usedMB = info ? (info.used / 1024 / 1024).toFixed(0) : 0

  return usedMB
}

function getCacheSizeText(usedMB) {
  let infoText = 'Cache is empty'

  if (usedMB >= 1000) {
    infoText = `${(usedMB / 1024).toFixed(1)}GB cached`;
  } else if (usedMB >= 1) {
    infoText = `${usedMB.toFixed(0)}MB cached`;
  }

  return infoText
}

export function initialize(filePickerType) {
  // define custom elements
  customElements.define('audio-file', AudioFile)
  // customElements.define('input-view', InputView)

  const controls = document.getElementById('controls')
  // instantiate folder and file picker template
  let filePickerTemplate = document.getElementById(filePickerType.description)
  let filePickerElement = filePickerTemplate.content.cloneNode(true)
  controls.appendChild(filePickerElement)

  // initialize appropriate file picker and bind events
  const picker = filePickerType.description == PICKER_FSA ? new FSAPicker : new OPFSPicker

  // folder picker event
  document.getElementById('folder-picker').addEventListener('click', async (event) => {
    await picker.onClickSelectFolder(event, async (files) => {
      const inputTab = document.querySelector('#tab-content0 .tab-body')
      inputTab.classList.remove('empty-input')

      for (const file of files) {
        const audioFile = document.createElement('audio-file')
        audioFile.data = await loadAudioFile(file);

        audioFile.render(file)
        inputTab.appendChild(audioFile)
      }
    })
  })

  // file picker event
  document.getElementById('file-picker').addEventListener('click', async (event) => {
    await picker.onClickSelectFile(event, async (files) => {
      const inputTab = document.querySelector('#tab-content0 .tab-body')
      inputTab.classList.remove('empty-input')

      for (const file of files) {
        const audioFile = document.createElement('audio-file')
        audioFile.data = await loadAudioFile(file);

        audioFile.render(file)
        inputTab.appendChild(audioFile)
      }
    })
  })

  // instantiate model controls
  let modelControlsTemplate = document.getElementById('ModelControls')
  let modelControls = modelControlsTemplate.content.cloneNode(true)
  controls.appendChild(modelControls)

  const clearCacheButton = document.getElementById('clear-cache')
  clearCacheButton.addEventListener('click', async (event) => {
    if (event.currentTarget.disabled) return

    // confirm clear cache
    const currentSize = await getCacheSize()
    const confirmed = confirm(
      `Delete downloaded model files?\n\n` +
      `This will free ~${currentSize}MB of storage.\n` +
      `Models will be need to be downloaded again.`
    )

    if (!confirmed) return;

    updateAppState(STATE_CLEARING, 'Deleting cache...')

    await clearModelCache();

    const newSize = await getCacheSize()
    updateAppState(STATE_CLEARING, getCacheSizeText(newSize))
    event.currentTarget.disabled = newSize < 1
  })

  // check cache and update controls
  getCacheSize().then((cacheSize) => {
    clearCacheButton.disabled = cacheSize < 1
  })

  document.getElementById('load-model').addEventListener('click', async (event) => {
    const modelConfig = MODELS[DEFAULT_MODEL];

    if (audioModel) {
      updateAppState(STATE_CLEARING, 'Disposing previous model...');
      audioModel.dispose();
      // audioModel = null;
    }

    try {
      let useWebGPU = !!navigator.gpu;
      if (!useWebGPU) {
        updateAppState(STATE_CHECKING, 'WebGPU not available, falling back to WASM (CPU)');
      }

      const device = useWebGPU ? 'webgpu' : 'wasm';
      updateAppState(STATE_LOADING, `Loading audio model (${device})...`)

      audioModel = new AudioModel();
      await audioModel.load(modelConfig.path, {
        device,
        quantization: modelConfig.quantization || null,
        progressCallback: ({ file, progress, status }) => {
          updateAppState(STATE_LOADING, `Loading ${file}...`, { progress, status })
        },
      });

      updateAppState(STATE_READY, `Audio model loaded on ${device === 'webgpu' ? 'WebGPU' : 'CPU'}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      updateAppState(STATE_ERROR, `Error loading model: ${msg}`)
      audioModel = null;
    }
  })

  document.getElementById('transcribe').addEventListener('click', async (event) => {
    // let generatedText = ''
    // let tokenCount = 0
    const audioFiles = document.querySelectorAll('audio-file')

    const onTokenCallback = (token, tokenId) => {
      if (token.includes('<|im_end|>') || token.includes('<|endoftext|>')) {
        return true;
      }

      document.querySelector('#tab-content1 .tab-body').textContent = token
      // generatedText += token;
      // tokenCount++;
      // const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      // updateSpinner(null, `${tokenCount} tokens · ${elapsed}s`);
      return false;
    };

    let audioToSend = audioFiles[0].data
    const finalText = await audioModel.transcribe(
      audioToSend.audioData,
      audioToSend.sampleRate,
      { onToken: onTokenCallback }
    );

    console.log(finalText)
  })
}
