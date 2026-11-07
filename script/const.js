
export const SYMBOL_NONE = 'None'
export const SYMBOL_FSA = 'FileSystemAccess'
export const SYMBOL_OPFS = 'OriginPrivateFileSystem'

export const FilePickerAPI = Object.freeze({
  NONE: Symbol(SYMBOL_NONE),
  FSA: Symbol(SYMBOL_FSA),
  OPFS: Symbol(SYMBOL_OPFS),
});

export const CONTROLS_ID = 'controls'
export const ERROR_LABEL = `#${CONTROLS_ID} .error`
export const FILE_PICKER_ID = 'file-picker'
export const FOLDER_PICKER_ID = 'folder-picker'