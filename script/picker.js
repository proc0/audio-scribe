import { 
	FILE_PICKER_ID,
	FOLDER_PICKER_ID 
} from './const'

const AUDIO_EXTENSIONS = [
  '.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac',
  '.aiff', '.aif', '.wma', '.opus',
];

function isAudioFile(fileName) {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

class AudioFile {
	constructor(name, path, size) {
		this.name = name
		this.path = path
		this.size = size
	}
}

export class FSAPicker {
	async selectFolder() {
	    let rootHandle;
	    try {
	      rootHandle = await window.showDirectoryPicker({ mode: 'read' });
	    } catch (error) {
	      if (error.name === 'AbortError') return [];
	      throw error;
	    }

			async function* traverseSync(entry, currentPath) {
			  const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;
			  
			  if (entry.kind === "file") {
			    const file = await entry.getFile();

			    if (file !== null && isAudioFile(entry.name)) {
			      const audioFile = new AudioFile(entry.name, path, entry.size)
			      yield audioFile;
			    }
			  } else if (entry.kind === "directory") {
			    for await (const handle of entry.values()) {
			      yield* traverseSync(handle, path);
			    }
			  }
			}

			for await (const audioFile of traverseSync(rootHandle, '')) {
			  console.log(audioFile);
			}
	    // const results = [];
	    // const walk = async (handle, currentPath) => {
	    //   for await (const entry of handle.values()) {
	    //     const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;

	    //     if (entry.kind === 'directory') {
	    //       await walk(entry, path);
	    //     } else if (isAudioFile(entry.name)) {
	    //       const file = await entry.getFile();
	    //       results.push({ path, size: file.size, lastModified: new Date(file.lastModified) });
	    //     }
	    //   }
	    // };

	    // await walk(rootHandle, '');
	    // console.log(results)
	    // return results;
	}

	async selectFile() {
			const options = {
			  types: [
			    {
			      description: "Audio",
			      accept: {
			        "audio/*": AUDIO_EXTENSIONS,
			      },
			    },
			  ],
			  excludeAcceptAllOption: true,
			  multiple: true,
			};

	    let fileList = [];
	    try {
	      fileList = await window.showOpenFilePicker(options);
	    } catch (error) {
	      if (error.name === 'AbortError') return [];
	      throw error;
	    }

	    console.log(fileList)
	}
}

export class OPFSPicker {

	constructor() {
		let folderPickerInput = document.getElementById(FOLDER_PICKER_ID).nextElementSibling
		let filePickerInput = document.getElementById(FILE_PICKER_ID).nextElementSibling

		folderPickerInput.addEventListener('change', this.selectFolder)
		filePickerInput.addEventListener('change', this.selectFile)
	}
	
	selectFolder(event) {
		if (event.type === 'click') {
			this.nextElementSibling.click()
			return;
		}

		console.log(event.target.files)
	}

	selectFile(event) {
		if (event.type === 'click') {
			this.nextElementSibling.click()
			return;
		}

		console.log(event.target.files)
	}
}
