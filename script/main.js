
const CONTROLS_ID = 'controls'
const ERROR_LABEL = `#${CONTROLS_ID} .error`
const FILE_PICKER_ID = 'file-picker'

function initialize() {
	try {
		let filePickerTemplate = document.getElementById(filePickerType.description)
		let filePicker = filePickerTemplate.content.cloneNode(true)
		document.getElementById(CONTROLS_ID).appendChild(filePicker)

		if (filePickerType.description == SYMBOL_NONE) {
			let errorMessage = document.querySelector(ERROR_LABEL).textContent
			throw new Error(errorMessage)
		}

		bindEvents()
	} catch(error) {
		console.error(error)
	}
}

const AUDIO_EXTENSIONS = [
  '.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac',
  '.aiff', '.aif', '.wma', '.opus',
];

function isAudioFile(fileName) {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

function bindEvents() {
	if (filePickerType.description == SYMBOL_FSA) {
		document.getElementById(FILE_PICKER_ID).addEventListener('click', async () => {
		    let rootHandle;
		    try {
		      rootHandle = await window.showDirectoryPicker({ mode: 'read' });
		    } catch (error) {
		      if (error.name === 'AbortError') return [];
		      throw error;
		    }

		    const results = [];
		    const walk = async (handle, currentPath) => {
		      for await (const entry of handle.values()) {
		        const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;

		        if (entry.kind === 'directory') {
		          await walk(entry, path);
		        } else if (isAudioFile(entry.name)) {
		          const file = await entry.getFile();
		          results.push({ path, size: file.size, lastModified: new Date(file.lastModified) });
		        }
		      }
		    };

		    await walk(rootHandle, '');
		    console.log(results)
		    return results;
		})
	} else if (filePickerType.description == SYMBOL_OPFS) {
		document.getElementById(FILE_PICKER_ID).addEventListener('change', (event) => {
			console.log(event.target.files)
		})
	}
}