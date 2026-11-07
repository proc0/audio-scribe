import { initialize } from './main'
import { SYMBOL_NONE, SYMBOL_FSA, SYMBOL_OPFS, FilePickerAPI } from './const'

// check which file picker type the browser supports
let filePickerType = FilePickerAPI.NONE
if (window.showDirectoryPicker && typeof window.showDirectoryPicker === 'function') {
	// File System Access is supported by Chromium browsers
	filePickerType = FilePickerAPI.FSA
} else if (navigator?.storage && 'getDirectory' in navigator.storage) {
	// Origin Private File System is supported by most other browsers
	filePickerType = FilePickerAPI.OPFS
}

initialize(filePickerType)