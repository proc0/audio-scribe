const SYMBOL_NONE = 'None'
const SYMBOL_FSA = 'FileSystemAccess'
const SYMBOL_OPFS = 'OriginPrivateFileSystem'

const FilePickerAPI = Object.freeze({
  NONE: Symbol(SYMBOL_NONE),
  FSA: Symbol(SYMBOL_FSA),
  OPFS: Symbol(SYMBOL_OPFS),
});

let filePickerType = FilePickerAPI.NONE
if (window.showDirectoryPicker && typeof window.showDirectoryPicker === 'function') {
	filePickerType = FilePickerAPI.FSA
} else if (navigator?.storage && 'getDirectory' in navigator.storage) {
	filePickerType = FilePickerAPI.OPFS
}

window.onload = initialize
