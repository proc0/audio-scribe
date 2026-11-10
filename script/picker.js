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
	constructor(file) {
		this.name = file.name
		this.path = file.path
		this.size = file.size
	}
}

async function* traverseSync(entry, path) {
  if (entry.kind === "file") {
    const file = await entry.getFile()

    if (file !== null) {
    	file.path = path
      yield file
    }
  } else if (entry.kind === "directory") {
  	const dirPath = path.length ? `${path}/${entry.name}` : entry.name;

    for await (const handle of entry.values()) {
      yield* traverseSync(handle, dirPath);
    }
  }
}

async function traverse(entry, path, files) {
  if (entry.kind === "file") {
    const file = await entry.getFile();

    if (file !== null) {
    	file.path = path
      files.push(file)
    }
  } else if (entry.kind === "directory") {
  	const dirPath = path.length ? `${path}/${entry.name}` : entry.name;

    for await (const handle of entry.values()) {
      await traverse(handle, dirPath, files);
    }
  }

  return files
}

export class FSAPicker {
	async selectFolder() {
    let rootDir;
    try {
      rootDir = await window.showDirectoryPicker({ mode: 'read' });
    } catch (error) {
      if (error.name === 'AbortError') return [];
      throw error;
    }

		const files = await traverse(rootDir, '', [])
		const audioFiles = files
			.filter((file) => isAudioFile(file.name))

    return audioFiles;
	}
	
	async selectFolderSync(processAudioFile) {
    let rootDir;
    try {
      rootDir = await window.showDirectoryPicker({ mode: 'read' });
    } catch (error) {
      if (error.name === 'AbortError') return [];
      throw error;
    }

		for await (const file of traverseSync(rootDir, '')) {
	    if (isAudioFile(file.name)) {
	      const audioFile = new AudioFile(file)
		  	processAudioFile(audioFile);
	    }
		}
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

	    let audioFiles = []
	    try {
	      const fileHandles = await window.showOpenFilePicker(options);

	      for (const fileHandle of fileHandles) {
	      	if (isAudioFile(fileHandle.name)) {
	      		const audioFile = await fileHandle.getFile()
	      		audioFiles.push(audioFile)
	      	}
	      }

	    } catch (error) {
	      if (error.name === 'AbortError') return [];
	      throw error;
	    }
	    
	    return audioFiles
	}

	async onClickSelectFolder(event, processAudioFiles) {
    const audioFiles = await this.selectFolder(event)

    return processAudioFiles(audioFiles)
  }

 	async onClickSelectFile(event, processAudioFiles) {
    const audioFiles = await this.selectFile(event)

    return processAudioFiles(audioFiles)
  }
}

export class OPFSPicker {

	constructor() {
		let folderPickerInput = document.getElementById(FOLDER_PICKER_ID).nextElementSibling
		let filePickerInput = document.getElementById(FILE_PICKER_ID).nextElementSibling

		folderPickerInput.addEventListener('change', this.selectFolder)
		filePickerInput.addEventListener('change', this.selectFile)
	}
	
	async selectFolder(event) {
		if (event.type === 'click') {
			event.currentTarget.nextElementSibling.click()
			return;
		}

		return event.target.files
	}

	async selectFile(event) {
		if (event.type === 'click') {
			event.currentTarget.nextElementSibling.click()
			return;
		}

		return event.target.files
	}

	async onClickSelectFolder(event, processAudioFiles) {
    event.currentTarget.nextElementSibling.addEventListener('change', async (e) => {
      await processAudioFiles(e.target.files)
      e.currentTarget.removeEventListener('change')
    })

    await this.selectFolder(event)
  }

 	async onClickSelectFile(event, processAudioFiles) {
    event.currentTarget.nextElementSibling.addEventListener('change', async (e) => {
      await processAudioFiles(e.target.files)
      e.currentTarget.removeEventListener('change')
    })

    await this.selectFile(event)
  }
}
