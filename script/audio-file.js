import { createWavBlob } from './audio-tool'

const DEFAULT_VOLUME = 0.66

export class AudioFile extends HTMLElement {
  data = null
  audio = null
  progressBar = null

  volumeDragging = false

  constructor() {
    super()
  }

  render(file) {
    const audioTemplate = document.getElementById('audio-file').content.cloneNode(true)
    this.appendChild(audioTemplate)

    const audioTitle = this.querySelector('.audio-title')
    audioTitle.textContent = file.name

    const audioSubtitle = this.querySelector('.audio-subtitle')
    // audio size after decoding (default 48000 32-bit floating point linear PCM)
    const audioSize = this.formatSize(this.data.audioData.byteLength)
    // file size on disk (encoding and bit rate will vary)
    const fileSize = this.formatSize(file.size)
    audioSubtitle.textContent = `file size: ${fileSize} • sample size: ${audioSize} • sample rate: ${this.data.sampleRate}kHz`

    const audioPlayer = this.querySelector('.audio-player')
    this.progressBar = audioPlayer.querySelector('.bar-progress')
    this.progressBar.addEventListener('click', this.onSeek.bind(this))

    this.audio = audioPlayer.querySelector('audio')
    this.audio.addEventListener('timeupdate', this.onTimeUpdate.bind(this))
    this.audio.addEventListener('ended', this.onEnded.bind(this))

    audioPlayer.querySelector('.button-play').addEventListener('click', this.togglePlay.bind(this))
    audioPlayer.querySelector('.button-stop').addEventListener('click', this.togglePlay.bind(this))

    audioPlayer.querySelector('.button-volume').addEventListener('click', (event) => {
      const volumeBar = event.currentTarget.nextSibling

      if (volumeBar.classList.contains('invisible')) {
        volumeBar.classList.remove('invisible')
      } else {
        volumeBar.classList.add('invisible')
      }
    })

    // handle changing the volume by clicking or dragging
    const volumeBar = audioPlayer.querySelector('.volume')
    volumeBar.addEventListener('mousedown', (event) => {
      event.currentTarget.addEventListener('mousemove', this.onVolumeDrag)
      this.volumeDragging = true
    });
    const endDragging = (e) => {
      if (!this.volumeDragging) return;
      this.onVolumeDrag(e)
      volumeBar.removeEventListener('mousemove', this.onVolumeDrag)
      this.audio.volume = (volumeBar.value / 100).toFixed(3)
      this.volumeDragging = false
    }
    // remove drag handler
    volumeBar.addEventListener('mouseup', endDragging)
    volumeBar.addEventListener('mouseout', endDragging)
    // init volume level
    this.audio.volume = DEFAULT_VOLUME
    volumeBar.value = DEFAULT_VOLUME * 100
    
    // handle delete audio file
    const buttonRemove = this.querySelector('.button-remove')
    buttonRemove.addEventListener('click', () => {
      this.remove()
    })
  }

  formatSize(bytes) {
    let resultSize = bytes/1024
    let unit = 'KB'

    if (resultSize >= 1024) {
      resultSize = resultSize/1024
      unit = 'MB'
    }

    return `${Math.round(resultSize)}${unit}`
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  togglePlay() {
    if (!this.audio.src) {
      // NOTE: to play original file, save file in constructor and use arrayBuffer:
      // const blob = new Blob([await file.arrayBuffer()], { type: 'audio/wav' });
      // const audioUrl = URL.createObjectURL(blob)

      const wavBlob = createWavBlob(this.data.audioData, this.data.sampleRate)
      const audioUrl = URL.createObjectURL(wavBlob)
      this.audio.src = audioUrl
    }

    if (this.audio.paused) {
      this.audio.play();
      this.querySelector('.button-play').classList.add('hidden')
      this.querySelector('.button-stop').classList.remove('hidden')
    } else {
      this.audio.pause();
      this.querySelector('.button-play').classList.remove('hidden')
      this.querySelector('.button-stop').classList.add('hidden')
    }
  }

  onEnded() {
    this.querySelector('.button-play').classList.remove('hidden')
    this.querySelector('.button-stop').classList.add('hidden')
  }

  onSeek(event) {
    if (!this.audio.src) return

    const clickPosition = event.offsetX / this.progressBar.offsetWidth
    this.audio.currentTime = clickPosition * this.audio.duration
  }

  onTimeUpdate() {
    this.progressBar.value = (this.audio.currentTime / this.audio.duration) * 100
    this.progressBar.previousSibling.textContent = this.formatTime(this.audio.currentTime)
    this.progressBar.nextSibling.textContent = `-${this.formatTime(this.audio.duration - this.audio.currentTime)}`
  }

  onVolumeDrag(event) {
    const volumeBar = event.currentTarget
    const volumeBarPos = volumeBar.getBoundingClientRect()
    const clickPosition = (event.clientX - volumeBarPos.x) / volumeBar.offsetWidth
    volumeBar.value = clickPosition * 100
  }

  changeVolume(change) {
     this.audio.volume = Math.max(0, Math.min(1, this.audio.volume + change))
  }
}
