export class AudioFile extends HTMLElement {
  data = null

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
    audioSubtitle.textContent = `size: ${audioSize} (${fileSize} uploaded) • sample rate: ${this.data.sampleRate}`

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

    return `${resultSize.toFixed(1)}${unit}`
  }
}
