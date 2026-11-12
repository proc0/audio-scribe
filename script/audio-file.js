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
    audioSubtitle.textContent = `size: ${this.data.audioData.length} • sampleRate: ${this.data.sampleRate}`

    const buttonRemove = this.querySelector('.button-remove')
    buttonRemove.addEventListener('click', () => {
      this.remove()
    })
  }
}
