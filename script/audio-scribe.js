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
  extractAudioFiles
} from './audio-tool'
import {
  STATE_DEFAULT,
  STATE_CHECKING,
  STATE_LOADING,
  STATE_CLEARING,
  STATE_READY,
  STATE_ERROR,
  AppState,
  FILE_SYSTEM_FSA,
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

    const controls = document.getElementById('controls')
    // instantiate folder and file picker template
    let audioPickerTemplate = document.getElementById(fileAPI.description)
    let audioPickerElement = audioPickerTemplate.content.cloneNode(true)
    controls.prepend(audioPickerElement)

    // initialize appropriate file picker and bind events
    this.audioPicker = fileAPI.description == FILE_SYSTEM_FSA ? new FSAPicker : new OPFSPicker
    // folder picker event
    document.getElementById('folder-picker').addEventListener('click', async (event) => {
      await this.audioPicker.onClickSelectFolder(event, this.addAudioFiles.bind(this))
    })
    // file picker event
    document.getElementById('file-picker').addEventListener('click', async (event) => {
      await this.audioPicker.onClickSelectFile(event, this.addAudioFiles.bind(this))
    })

    // drag and drop files and folders
    document.addEventListener('dragenter', (event) => {
      event.preventDefault();
      if (this.state === STATE_LOADING || this.state === STATE_ERROR) return;
    });
    const inputTab = document.getElementById('audio-files')
    inputTab.addEventListener('dragleave', (event) => {
      event.preventDefault();
    });
    inputTab.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    inputTab.addEventListener('drop', this.handleFileDrop.bind(this))

    // clear cache button
    const clearCacheButton = document.getElementById('clear-cache')
    clearCacheButton.addEventListener('click', this.clearCache.bind(this))
    // check cache and update controls
    this.getCacheSize().then((cacheSize) => {
      clearCacheButton.disabled = cacheSize < 1
    })
    // load model and settings
    document.getElementById('load-model').addEventListener('click', this.loadModel.bind(this))
    document.getElementById('settings').addEventListener('click', this.onClickSettings.bind(this))

    // track last tab to reopen when settings tab closes
    document.querySelectorAll('.tab-label').forEach((tab) => {
      tab.addEventListener('click', (event) => {
        this.lastTabOpened = event.currentTarget.getAttribute('for')
      })
    })
    // track whether the info details was collapsed
    document.getElementById('info').addEventListener('click', (event) => { this.infoOpened = event.currentTarget.open })
    
    // handle transcribe button
    document.getElementById('transcribe').addEventListener('click', this.transcribe.bind(this))
    document.getElementById('clear-input').addEventListener('click', this.clearInput.bind(this))
    // handle output tab save button
    document.getElementById('output-text').addEventListener('keyup', (event) => {
      document.getElementById('save').disabled = event.currentTarget.value.length === 0
    })
    document.getElementById('save').addEventListener('click', this.saveOutput.bind(this))
    document.getElementById('copy').addEventListener('click', this.copyToClipboard.bind(this))

    // check model status
    if (!this.audioModel) {
      this.update(STATE_DEFAULT, 'Audio AI is not loaded. Load the model to get started.\n')
    }

    const quickStart = document.getElementById('quick-start')
    document.getElementById('audio-files').append(quickStart.content.cloneNode(true))
    document.getElementById('quick-info-body').append(quickStart.content.cloneNode(true))
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
      // TODO: refactor updating info title
      const summary = infoDetails.querySelector('summary')
      summary.removeAttribute('class')
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
        // TODO: refactor updating info title
        const summary = infoDetails.querySelector('summary')
        summary.removeAttribute('class')
        summary.textContent = '🛈 Info'
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
      // TODO: refactor updating info title
      const summary = infoDetails.querySelector('summary')
      summary.removeAttribute('class')
      summary.textContent = '🛈 Info'
    } else if (this.state === STATE_CLEARING) {
      // TODO: refactor updating info title
      const summary = infoDetails.querySelector('summary')
      summary.removeAttribute('class')
      summary.textContent = '🛈 Info'
    } else if (this.state === STATE_READY) {
      // TODO: refactor updating info title
      const summary = infoDetails.querySelector('summary')
      summary.removeAttribute('class')
      summary.classList.add('ready')
      summary.textContent = '✔ Ready'
    }
  }

  async loadModel(event) {
    const modelConfig = MODELS[DEFAULT_MODEL];

    // NOTE: this clears the model used when changing models
    // if (this.audioModel) {
    //   this.update(STATE_CLEARING, 'Disposing previous model...');
    //   this.audioModel.dispose();
    //   this.audioModel = null;
    // }
    const loadModelButton = document.getElementById('load-model')
    loadModelButton.classList.remove('highlight')
    loadModelButton.disabled = true

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

      if (this.audioModel) {
        document.querySelector('#transcribe').disabled = false
      }

      this.update(STATE_READY, `Audio model loaded on ${device === 'webgpu' ? 'WebGPU' : 'CPU'}`)

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.update(STATE_ERROR, `Error loading model: ${message}`)
      this.audioModel = null;
    }

  }

  async addAudioFiles(files) {
    if (!files.length) return;
    
    const inputTab = document.getElementById('audio-files')

    for (const file of files) {
      const audioFile = document.createElement('audio-file')
      audioFile.data = await loadAudioFile(file);

      audioFile.render(file)
      inputTab.appendChild(audioFile)
    }

    if (inputTab.querySelector('audio-file')) {
      inputTab.querySelector('.quick-start').remove()
      inputTab.classList.remove('empty-input')
    }

    if (this.audioModel) {
      document.querySelector('#transcribe').disabled = false
    }
    document.querySelector('#clear-input').disabled = false

    this.update(STATE_DEFAULT, `Loaded ${files.length} audio file(s)`)
  }

  async transcribe(event) {
    // const audioFilesContainer = document.querySelectorAll('audio-files')
    const audioFiles = document.querySelectorAll('audio-file')

    let totalFiles = audioFiles.length
    if (!totalFiles) return;

    const transcribeButton = document.querySelector('#transcribe')
    const outputText = document.getElementById('output-text')
    const formatText = document.getElementById('format-output-text').value
    const isValidFormat = formatText.length && formatText.includes('%RESULT%')

    // toggle buttons
    transcribeButton.disabled = true

    let fileCount = 0
    for (const audioFile of audioFiles) {
      audioFile.startLoading()

      try {
        const resultText = await this.audioModel.transcribe(audioFile.data.audioData, audioFile.data.sampleRate);
        
        let finalText = resultText
        if (isValidFormat) {
          finalText = formatText.replace("%RESULT%", resultText)
          finalText = finalText.replace("%FILENAME%", audioFile.fileInfo.name)
          finalText = finalText.replace("%FILEPATH%", audioFile.fileInfo.path)
        }

        outputText.value += finalText
        fileCount++
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.update(STATE_ERROR, `Error transcribing audio: ${msg}`)
      }

      this.update(STATE_LOADING, `Transcribing ${audioFile.fileInfo.name}...`, { status: 'loading', progress: Math.round((fileCount/totalFiles)*100) })
      audioFile.endLoading(this.lastState !== STATE_ERROR)
    }

    this.update(STATE_LOADING, `Transcribing completed`, { status: 'done', progress: 100 })

    // toggle buttons
    document.getElementById('save').disabled = outputText.value.length === 0
    document.getElementById('copy').disabled = outputText.value.length === 0
    transcribeButton.disabled = false

    this.update(STATE_READY, `Transcribed ${fileCount} of ${totalFiles} files`)

    outputText.setAttribute('data-timestamp', (new Date()).toISOString())
    // focus output tab
    document.getElementById('tab1').checked = true

    // NOTE: pass this to transcribe options to process each token
    // pass { onToken: onTokenCallback } into audioModel.transcribe
    // I.E.:
    // let generatedText = ''
    // let tokenCount = 0
    // const onTokenCallback = (token, tokenId) => {
    //   if (token.includes('<|im_end|>') || token.includes('<|endoftext|>')) {
    //     return true;
    //   }
    //   // generatedText += token;
    //   // tokenCount++;
    //   // const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    //   // updateSpinner(null, `${tokenCount} tokens · ${elapsed}s`);
    //   return false;
    // };
  }

  clearInput(event) {
    document.querySelectorAll('audio-file').forEach(audioFile => audioFile.delete())
    document.getElementById('clear-input').disabled = true
  }

  async clearCache(event) {
    if (event.currentTarget.disabled) return

    // confirm clear cache
    const currentSize = await this.getCacheSize()
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
      tab0.checked = this.lastTabOpened === 'tab0' || this.lastTabOpened === 'tab2'
      tab1.checked = this.lastTabOpened === 'tab1'
      tab2.checked = false
      this.settingsOpened = false
    } else {        
      settingsLabel.classList.remove('hidden')
      settingsContent.classList.remove('hidden')
      tab0.checked = false
      tab1.checked = false
      tab2.checked = true
      this.settingsOpened = true
    }
  }

  saveOutput() {
    const text = document.getElementById('output-text').value;
    const timestamp = document.getElementById('output-text').getAttribute('data-timestamp');
    const filename = document.getElementById('settings-file-name').value || document.getElementById('settings-file-name').placeholder
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    a.download = filename.includes('.txt') ? filename.replace('%TIMESTAMP%', timestamp) : `${filename.replace('%TIMESTAMP%', timestamp)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async handleFileDrop(event) {
    event.preventDefault();

    if (this.state === STATE_LOADING || this.state === STATE_ERROR) return;

    let audioFiles = []
    if (event.dataTransfer.items) {
      audioFiles = await extractAudioFiles(event.dataTransfer.items)
    } else if (event.dataTransfer.files) {
      for (const file of event.dataTransfer.files) {
        if (file.type.startsWith('audio/'))
          audioFiles.push(file)
      }
    } else {
      this.update(STATE_ERROR, 'Unhandled drag and drop: Unrecognized file data')
    }

    await this.addAudioFiles(audioFiles)
  }

  copyToClipboard(event) {
    try {
      const text = document.getElementById('output-text').value
      return navigator.clipboard.writeText(text).then(() => {
        this.update(STATE_DEFAULT, 'Output text copied to clipboard.')
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.update(STATE_ERROR, `Failed to copy to clipboard: ${message}`)
    }
  }
}
