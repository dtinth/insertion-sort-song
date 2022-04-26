import * as animation from './animation'

let currentAnimation = animation

const audio = document.getElementById('audio') as HTMLAudioElement

function seekToFrame(frameNumber: number) {
  currentAnimation.renderAnimation(frameNumber)
}

if (new URLSearchParams(location.search).get('render') != null) {
  audio.hidden = true

  Object.assign(window, {
    getInfo: () => {
      return {
        fps: 60,
        numberOfFrames: 40 * 60,
      }
    },
    seekToFrame,
  })
} else {
  function frame() {
    const frameNumber = Math.floor(
      (audio.currentTime - ((5 / 2) * 60) / 108) * 60,
    )
    seekToFrame(frameNumber)
    requestAnimationFrame(frame)
  }

  frame()
}

// @ts-ignore
if (import.meta.hot) {
  // @ts-ignore
  import.meta.hot.accept('./animation', (a) => {
    currentAnimation = a
  })
}
