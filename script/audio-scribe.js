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

export class AudioScribe {
  state = STATE_DEFAULT
  lastState = STATE_DEFAULT
  audioModel = null
  audioPicker = null

  settingsOpened = false
  lastTabOpened = 'tab0'
  infoOpened = true

  constructor(fileAPI) {
    // define custom elements
    customElements.define('audio-file', AudioFile)
    // customElements.define('input-view', InputView)

    const controls = document.getElementById('controls')
    // instantiate folder and file picker template
    let audioPickerTemplate = document.getElementById(fileAPI.description)
    let audioPickerElement = audioPickerTemplate.content.cloneNode(true)
    controls.appendChild(audioPickerElement)

    // initialize appropriate file picker and bind events
    this.audioPicker = fileAPI.description == PICKER_FSA ? new FSAPicker : new OPFSPicker

    // folder picker event
    document.getElementById('folder-picker').addEventListener('click', async (event) => {
      await this.audioPicker.onClickSelectFolder(event, this.addAudioFiles.bind(this))
    })

    // file picker event
    document.getElementById('file-picker').addEventListener('click', async (event) => {
      await this.audioPicker.onClickSelectFile(event, this.addAudioFiles.bind(this))
    })

    // instantiate model controls
    let modelControlsTemplate = document.getElementById('ModelControls')
    let modelControls = modelControlsTemplate.content.cloneNode(true)
    controls.appendChild(modelControls)

    const clearCacheButton = document.getElementById('clear-cache')
    clearCacheButton.addEventListener('click', this.clearCache.bind(this))
    // check cache and update controls
    this.getCacheSize().then((cacheSize) => {
      clearCacheButton.disabled = cacheSize < 1
    })

    document.getElementById('load-model').addEventListener('click', this.loadModel.bind(this))
    document.getElementById('settings').addEventListener('click', this.onClickSettings.bind(this))

    document.getElementById('transcribe').addEventListener('click', this.transcribe.bind(this))

    // remember user action on info details opening or closing
    document.getElementById('info').addEventListener('click', (event) => { this.infoOpened = event.currentTarget.open })

    // check model status
    if (!this.audioModel) {
      this.update(STATE_DEFAULT, 'Audio model NOT loaded!')
    }
  }

  update(state, message, memo) {
    const infoDetails = document.getElementById('info')
    const infoBody = document.getElementById('info-body')

    if (state !== STATE_DEFAULT) {      
      this.lastState = this.state
      this.state = state
      const summary = infoDetails.querySelector('summary')
      summary.removeAttribute('class')
    }

    infoBody.textContent = infoBody.textContent.length ? `${message}\n${infoBody.textContent}` : message;
    infoDetails.open = this.infoOpened

    if (state === STATE_ERROR) {
      const summary = infoDetails.querySelector('summary')
      summary.classList.add('error')
      summary.textContent = '⚠ ERROR'
      console.error(message);
      return
    } else {
      console.log(message);
    }

    if (this.state === STATE_LOADING) {
      const progress = document.getElementById('loading-bar')

      if (this.lastState !== this.state) {
        progress.value = 0
        progress.setAttribute('style', 'visibility: visible')
      }

      if (memo?.status === 'loading') {      
        progress.value = memo.progress
      } else if (memo?.status === 'done') {
        progress.value = 100
        setTimeout(() => { 
          progress.removeAttribute('style')
        }, 1000)
      }

    } else if (this.state === STATE_CHECKING) {

    } else if (this.state === STATE_CLEARING) {

    } else if (this.state === STATE_READY) {
      const summary = infoDetails.querySelector('summary')
      summary.classList.add('ready')
      summary.textContent = '✔ Ready'
    }
  }

  async loadModel(event) {
    const modelConfig = MODELS[DEFAULT_MODEL];

    // if (audioModel) {
    //   this.update(STATE_CLEARING, 'Disposing previous model...');
    //   this.audioModel.dispose();
    //   // audioModel = null;
    // }

    try {
      let useWebGPU = !!navigator.gpu;
      if (!useWebGPU) {
        this.update(STATE_CHECKING, 'WebGPU not available, falling back to WASM (CPU)');
      }

      const device = useWebGPU ? 'webgpu' : 'wasm';
      this.update(STATE_LOADING, `Loading audio model (${device})...`)

      this.audioModel = new AudioModel();
      await this.audioModel.load(modelConfig.path, {
        device,
        quantization: modelConfig.quantization || null,
        progressCallback: ({ file, progress, status }) => {
          this.update(STATE_LOADING, status === 'done' ? 'Loading completed' : `Loading ${file}`, { progress, status })
        },
      });

      this.update(STATE_READY, `Audio model loaded on ${device === 'webgpu' ? 'WebGPU' : 'CPU'}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.update(STATE_ERROR, `Error loading model: ${msg}`)
      this.audioModel = null;
    }
  }

  async addAudioFiles(files) {
    const inputTab = document.querySelector('#tab-content0 .tab-body')
    inputTab.classList.remove('empty-input')

    for (const file of files) {
      const audioFile = document.createElement('audio-file')
      audioFile.data = await loadAudioFile(file);

      audioFile.render(file)
      inputTab.appendChild(audioFile)
    }

    this.update(STATE_DEFAULT, `Loaded ${files.length} audio file(s)`)
  }

  async transcribe(event) {
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
    const finalText = await this.audioModel.transcribe(
      audioToSend.audioData,
      audioToSend.sampleRate,
      { onToken: onTokenCallback }
    );
  }

  async clearCache(event) {
    if (event.currentTarget.disabled) return

    // confirm clear cache
    const currentSize = await getCacheSize()
    const confirmed = confirm(
      `Delete downloaded model files?\n\n` +
      `This will free ~${currentSize}MB of storage.\n` +
      `Models will be need to be downloaded again.`
    )

    if (!confirmed) return;

    this.update(STATE_CLEARING, 'Clearing cache...')

    await clearModelCache();

    const newSize = await this.getCacheSize()
    event.currentTarget.disabled = newSize < 1

    this.update(this.lastState, `Deleted ~${currentSize}MB. ${this.getCacheSizeText(newSize)} remaining.`)
  }

  async getCacheSize() {
    const info = await getCacheInfo()
    const usedMB = info ? (info.used / 1024 / 1024).toFixed(0) : 0

    return usedMB
  }

  getCacheSizeText(usedMB) {
    let infoText = 'Cache is empty'

    if (usedMB >= 1000) {
      infoText = `${(usedMB / 1024).toFixed(1)}GB cached`;
    } else if (usedMB >= 1) {
      infoText = `${usedMB.toFixed(0)}MB cached`;
    }

    return infoText
  }

  onClickSettings() {
    const tab0 = document.getElementById('tab0')
    const tab1 = document.getElementById('tab1')
    const tab2 = document.getElementById('tab2')
    const settingsLabel = document.getElementById('tab-label2')
    const settingsContent = document.getElementById('tab-content2')
    
    if (this.settingsOpened) {
      settingsLabel.classList.add('hidden')
      settingsContent.classList.add('hidden')
      tab0.checked = this.lastTabOpened === 'tab0'
      tab1.checked = this.lastTabOpened === 'tab1'
      tab2.checked = false
      this.settingsOpened = false
    } else {        
      settingsLabel.classList.remove('hidden')
      settingsContent.classList.remove('hidden')
      this.lastTabOpened = document.querySelector('input:checked').getAttribute('id')
      tab0.checked = false
      tab1.checked = false
      tab2.checked = true
      this.settingsOpened = true
    }
  }
}
