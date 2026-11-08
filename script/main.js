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
} from './const'
import { OPFSPicker, FSAPicker } from './picker'
import { AudioModel, loadAudioFile, clearModelCache, getCacheInfo } from './audio-model.js';

export function initialize(filePickerType) {
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

		// instatiate appropriate file picker and bind button events
		const picker = filePickerType.description == SYMBOL_FSA ? new FSAPicker : new OPFSPicker
		document.getElementById(FOLDER_PICKER_ID).addEventListener('click', picker.selectFolder)
		document.getElementById(FILE_PICKER_ID).addEventListener('click', picker.selectFile)

		// instantiate model controls
		let modelControlsTemplate = document.getElementById('ModelControls')
		let modelControls = modelControlsTemplate.content.cloneNode(true)
		document.getElementById(CONTROLS_ID).appendChild(modelControls)

		// bind model control events
		document.getElementById(CLEAR_CACHE_ID).addEventListener('click', () => {
			console.log('yeyayyayy')
		})
		document.getElementById(LOAD_MODEL_ID).addEventListener('click', () => {
			console.log('asdfasdf')
		})
	} catch(error) {
		console.error(error)
	}
}
