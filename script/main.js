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
import { 
  OPFSPicker, 
  FSAPicker
} from './picker'
import { 
  AudioModel,
  loadAudioFile,
  clearModelCache,
  getCacheInfo 
} from './audio-model.js';

let appState = STATE_DEFAULT
let transcribeFiles = []

// let audioModel = null
let audioModel = {
  dispose: () => { console.log('DISPOSING') },
  load: async (path, config) => {
    for (let i = 0; i < 10; i++) {
      const mockProg = { file: `file_${i}`, status: i < 9 ? 'loading' : 'done', progress: i*10 }
      await new Promise(resolve => setTimeout(() => { config.progressCallback(mockProg); resolve(); }, 400))
    }
  }
}

export function updateAppState(state, message, memo) {
  let lastState = appState
  appState = state

  const infoDetails = document.getElementById('info')
  const infoBody = infoDetails.querySelector('blockquote')

  console.log(message);

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

    infoBody.textContent = message

  } else if (state === STATE_CHECKING) {
    infoDetails.open = true
    infoBody.textContent = message

  } else if (state === STATE_CLEARING) {
    infoBody.textContent = message

  } else if (state === STATE_READY) {
    infoBody.textContent = message

  } else if (state === STATE_ERROR) {
    infoBody.textContent = message

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

  const controls = document.getElementById('controls')
  // check requirements before proceeding
  try {
    // instantiate picker template depending on type
    let filePickerTemplate = document.getElementById(filePickerType.description)
    let filePicker = filePickerTemplate.content.cloneNode(true)
    controls.appendChild(filePicker)

    // abort if no available file picker in browser
    if (filePickerType.description == PICKER_NONE) {
        let errorMessage = document.querySelector('#controls .error').textContent
        throw new Error(errorMessage)
    }
  } catch(error) {
    console.error(error)
    return
  }

  // instatiate appropriate file picker and bind button events
  const picker = filePickerType.description == PICKER_FSA ? new FSAPicker : new OPFSPicker
  document.getElementById('folder-picker').addEventListener('click', async (event) => {
    await picker.onClickSelectFolder(event, async (audioFiles) => {

      const audioPreviews = document.createElement('ul')

      for (const audioFile of audioFiles) {
        const transcribeFile = await loadAudioFile(audioFile);
        
        const audioPreview = document.createElement('li')
        
        audioPreview.textContent = `${audioFile.name} - ${transcribeFile.audioData.length} - ${transcribeFile.sampleRate}`
        audioPreviews.appendChild(audioPreview)

        transcribeFiles.push(transcribeFile)
      }
      document.querySelector('#tab-content0 .tab-body').appendChild(audioPreviews)
    })
  })

  document.getElementById('file-picker').addEventListener('click', async (event) => {
    await picker.onClickSelectFile(event, async (audioFiles) => {

      const audioPreviews = document.createElement('ul')

      for (const audioFile of audioFiles) {
        const transcribeFile = await loadAudioFile(audioFile);

        const audioPreview = document.createElement('li')
        
        audioPreview.textContent = `${audioFile.name} - ${transcribeFile.audioData.length} - ${transcribeFile.sampleRate}`
        audioPreviews.appendChild(audioPreview)

        transcribeFiles.push(transcribeFile)
      }

      document.querySelector('#tab-content0 .tab-body').appendChild(audioPreviews)
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
        console.warn('WebGPU not available, falling back to WASM (CPU)');
      }

      const device = useWebGPU ? 'webgpu' : 'wasm';
      updateAppState(STATE_LOADING, `Loading audio model (${device})...`)

      // audioModel = new AudioModel();
      await audioModel.load(modelConfig.path, {
        device,
        quantization: modelConfig.quantization || null,
        progressCallback: ({ file, progress, status }) => {
          updateAppState(STATE_LOADING, `Loading ${file}...`, { progress, status })
        },
      });

      updateAppState(STATE_READY, `Ready! Audio model loaded on ${device === 'webgpu' ? 'WebGPU' : 'CPU'}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      updateAppState(STATE_ERROR, `Error loading model: ${msg}`)
      audioModel = null;
    }
  })

  document.getElementById('confirm-transcribe').addEventListener('click', async (event) => {
    let generatedText = ''
    let tokenCount = 0
    const onTokenCallback = (token, tokenId) => {
      if (token.includes('<|im_end|>') || token.includes('<|endoftext|>')) {
        return true;
      }
      generatedText += token;
      tokenCount++;
      // const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      // updateSpinner(null, `${tokenCount} tokens · ${elapsed}s`);
      return false;
    };

    let audioToSend = transcribeFiles[0]
    const finalText = await audioModel.transcribe(
      audioToSend.audioData,
      audioToSend.sampleRate,
      { onToken: onTokenCallback }
    );

    console.log(generatedText, finalText)
  })
}
