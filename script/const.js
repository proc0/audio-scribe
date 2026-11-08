// matches index.html template ids
export const SYMBOL_NONE = 'None'
export const SYMBOL_FSA = 'FileSystemAccess'
export const SYMBOL_OPFS = 'OriginPrivateFileSystem'

export const FilePickerAPI = Object.freeze({
  NONE: Symbol(SYMBOL_NONE),
  FSA: Symbol(SYMBOL_FSA),
  OPFS: Symbol(SYMBOL_OPFS),
});

// matches index.html element ids
export const CONTROLS_ID = 'controls'
export const ERROR_LABEL = `#${CONTROLS_ID} .error`
export const FILE_PICKER_ID = 'file-picker'
export const FOLDER_PICKER_ID = 'folder-picker'
export const CLEAR_CACHE_ID = 'clear-cache'
export const LOAD_MODEL_ID = 'load-model'
export const INFO_ID = 'info'

// HuggingFace model URL
export const MODEL_URL = 'https://huggingface.co/LiquidAI/LFM2.5-Audio-1.5B-ONNX/resolve/main';

// Model configurations
export const MODELS = {
  'LFM2.5-Audio-1.5B-Q4': {
    path: MODEL_URL,
    label: 'LFM2.5-Audio-1.5B Q4 (~1.6 GB)',
    quantization: {
      decoder: 'q4',
      audioEncoder: 'q4',
      audioEmbedding: 'q4',
      audioDetokenizer: 'q4',
      vocoder: 'q4',
    },
  },
};
