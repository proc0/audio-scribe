import { 
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
} from './const'
import { OPFSPicker, FSAPicker } from './picker'
import { AudioModel, loadAudioFile, clearModelCache, getCacheInfo } from './audio-model.js';

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
  document.getElementById(FOLDER_PICKER_ID).addEventListener('click', picker.selectFolder)
  document.getElementById(FILE_PICKER_ID).addEventListener('click', picker.selectFile)

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

  document.getElementById(LOAD_MODEL_ID).addEventListener('click', () => {
      console.log('asdfasdf')
  })
}
