import {
  STATE_DEFAULT,
  STATE_LOADING,
  STATE_CLEARING,
  STATE_READY,
  STATE_ERROR,
  AppState,
  SYMBOL_NONE,
  SYMBOL_FSA,
  SYMBOL_OPFS,
  CONTROLS_ID,
  ERROR_LABEL,
  FILE_PICKER_ID,
  FOLDER_PICKER_ID,
  CLEAR_CACHE_ID,
  LOAD_MODEL_ID,
  INFO_ID,
  ID_TAB_CONTENTS,
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

let audioModel = {
  dispose: () => { console.log('DISPOSING') },
  load: async (path, config) => {
    for (let i = 0; i < 10; i++) {
      const mockProg = { status: i < 9 ? 'loading' : 'done' }
      await new Promise(resolve => setTimeout(() => { config.progressCallback(mockProg); resolve(); }, 400))
    }
  }
}

function updateAppState(state, message) {
  appState = state

  if (state == STATE_DEFAULT) {

  } else if (state === STATE_LOADING) {
    console.log(message);

  } else if (state === STATE_CLEARING) {
    console.log(message);

  } else if (state === STATE_READY) {
    console.log(message);

  } else if (state === STATE_ERROR) {
     console.error('Error:', message);
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
  // check requirements before proceeding
  try {
    // instantiate picker template depending on type
    let filePickerTemplate = document.getElementById(filePickerType.description)
    let filePicker = filePickerTemplate.content.cloneNode(true)
    document.getElementById(CONTROLS_ID).appendChild(filePicker)

    // abort if no available file picker in browser
    if (filePickerType.description == SYMBOL_NONE) {
        let errorMessage = document.querySelector(ERROR_LABEL).textContent
        throw new Error(errorMessage)
    }
  } catch(error) {
    console.error(error)
    return
  }

  // instatiate appropriate file picker and bind button events
  const picker = filePickerType.description == SYMBOL_FSA ? new FSAPicker : new OPFSPicker
  document.getElementById(FOLDER_PICKER_ID).addEventListener('click', async (event) => {
    await picker.onClickSelectFolder(event, async (audioFiles) => {
      
      const audioPreviews = document.createElement('ul')

      for (const audioFile of audioFiles) {
        const { audioData, sampleRate } = await loadAudioFile(audioFile);
        const audioPreview = document.createElement('li')
        audioPreview.textContent = `${audioFile.name} - ${audioData.length} - ${sampleRate}`
        audioPreviews.appendChild(audioPreview)
      }
      document.getElementById(ID_TAB_CONTENTS).appendChild(audioPreviews)
    })
  })

  document.getElementById(FILE_PICKER_ID).addEventListener('click', async (event) => {
    await picker.onClickSelectFile(event, async (audioFiles) => {

      const audioPreviews = document.createElement('ul')

      for (const audioFile of audioFiles) {
        const { audioData, sampleRate } = await loadAudioFile(audioFile);
        const audioPreview = document.createElement('li')
        audioPreview.textContent = `${audioFile.name} - ${audioData.length} - ${sampleRate}`
        audioPreviews.appendChild(audioPreview)
      }

      document.getElementById(ID_TAB_CONTENTS).appendChild(audioPreviews)
    })
  })

  // instantiate model controls
  let modelControlsTemplate = document.getElementById('ModelControls')
  let modelControls = modelControlsTemplate.content.cloneNode(true)
  document.getElementById(CONTROLS_ID).appendChild(modelControls)

  const clearCacheButton = document.getElementById(CLEAR_CACHE_ID)
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

    // clear cache and update info texts plus button status
    const infoDetails = document.getElementById(INFO_ID)
    infoDetails.querySelector('label').textContent = 'Deleting cache...'
    infoDetails.open = true

    await clearModelCache();

    const newSize = await getCacheSize()
    infoDetails.querySelector('label').textContent = getCacheSizeText(newSize)
    event.currentTarget.disabled = newSize < 1
  })

  // check cache and update controls
  getCacheSize().then((cacheSize) => {
    clearCacheButton.disabled = cacheSize < 1
  })

  document.getElementById(LOAD_MODEL_ID).addEventListener('click', async (event) => {
    const modelConfig = MODELS[DEFAULT_MODEL];

    // setLoading(true);
    // setReady(false);
    // showProgress(true);
    // updateProgress(0, 'Starting...');
    // setStatus(`Loading ${modelConfig.label}...`);

    if (audioModel) {
      console.log('Disposing previous model...');
      audioModel.dispose();
      // audioModel = null;
    }

    // messages = [];
    // pendingAudio = null;
    // chatContainer.innerHTML = '';

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
        progressCallback: (progress) => {
          if (progress.status === 'loading') {
            console.log(progress)
            // updateProgress(progress.progress, `Loading ${progress.file}...`);
          } else if (progress.status === 'done') {
            // updateProgress(100, 'Done');
            console.log("DONE")
            console.log(progress)
          }
        },
      });

      // showProgress(false);
      updateAppState(STATE_READY, `Ready! Audio model loaded on ${device === 'webgpu' ? 'WebGPU' : 'CPU'}`)
      // setStatus(`Ready! Audio model loaded on ${device === 'webgpu' ? 'WebGPU' : 'CPU'}`, 'success');
      // setReady(true);
      // updateCacheInfo();
      // updatePlaceholder();

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      updateAppState(STATE_ERROR, `Error loading model: ${msg}`)
      audioModel = null;
    } finally {
      // setLoading(false);
    }
  })
}
