export class AudioPreview extends HTMLElement {
  data = null

  constructor() {
    super()
  }

  render(audioFile) {
    const audioTemplate = document.getElementById('audio-template').content.cloneNode(true)
    this.appendChild(audioTemplate)

    const audioTitle = this.querySelector('.audio-title')
    audioTitle.textContent = audioFile.name

    const audioSubtitle = this.querySelector('.audio-subtitle')
    audioSubtitle.textContent = `size: ${this.data.audioData.length} • sampleRate: ${this.data.sampleRate}`

  }
}
