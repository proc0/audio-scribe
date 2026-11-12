// Model configurations
export const MODELS = {
  'LFM2.5-Audio-1.5B-Q4': {
    path: 'https://huggingface.co/LiquidAI/LFM2.5-Audio-1.5B-ONNX/resolve/main',
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

export const DEFAULT_MODEL = 'LFM2.5-Audio-1.5B-Q4'

// App States
export const STATE_DEFAULT = 'Default'
export const STATE_CHECKING = 'Checking'
export const STATE_LOADING = 'Loading'
export const STATE_CLEARING = 'Clearing'
export const STATE_READY = 'Ready'
export const STATE_ERROR = 'Error'

export const AppState = Object.freeze({
  DEFAULT: Symbol(STATE_DEFAULT),
  CHECKING: Symbol(STATE_CHECKING),
  LOADING: Symbol(STATE_LOADING),
  CLEARING: Symbol(STATE_CLEARING),
  READY: Symbol(STATE_READY),
  ERROR: Symbol(STATE_ERROR),
});

// matches index.html template ids
export const PICKER_NONE = 'None'
export const PICKER_FSA = 'FileSystemAccess'
export const PICKER_OPFS = 'OriginPrivateFileSystem'

export const FilePickerAPI = Object.freeze({
  NONE: Symbol(PICKER_NONE),
  FSA: Symbol(PICKER_FSA),
  OPFS: Symbol(PICKER_OPFS),
});
