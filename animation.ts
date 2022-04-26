import * as THREE from 'three'
import Chance from 'chance'
import { renderer, w, h } from './renderer'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js'

const scene = new THREE.Scene()
const composer = new EffectComposer(renderer)

const rng = new Chance('insertion sort')

const blackMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
})
const sortedMaterial = new THREE.MeshPhongMaterial({
  color: 0xd7fc70,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
})
const activeMaterial = new THREE.MeshPhongMaterial({
  color: 0x3ea6ff,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
  specular: 0xffffff,
})
const wireframeMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  linewidth: 2,
})

const light1 = new THREE.PointLight(0xffffff, 1, 0)
light1.position.set(200, 80, -200)
scene.add(light1)

const light2 = new THREE.PointLight(0xffffff, 1, 0)
light2.position.set(200, 160, 200)
scene.add(light2)

const onFrame: ((f: number) => void)[] = []

function createBox(x, z, height) {
  const geometry = new THREE.BoxGeometry()
  geometry.translate(0, 0.5, 0)

  const edges = new THREE.EdgesGeometry(geometry)
  const mesh = new THREE.Mesh(geometry, blackMaterial)
  const wireframe = new THREE.LineSegments(edges, wireframeMaterial)
  mesh.add(wireframe)
  mesh.position.x = x
  mesh.position.z = z
  mesh.scale.y = height
  return {
    get x() {
      return mesh.position.x
    },
    set x(x: number) {
      mesh.position.x = x
    },
    mesh,
    setHighlight: (mode: Highlight) => {
      mesh.material =
        mode === 'active'
          ? activeMaterial
          : mode === 'sorted'
          ? sortedMaterial
          : blackMaterial
      wireframe.visible = mode == null
    },
  }
}

function createSortingAnimation(n: number) {
  const frames: number[][] = []

  const values = rng.shuffle(new Array(n - 1).fill(0).map((_x, i) => i + 1))
  values.push(values.length)

  const array = new Array(n).fill(0).map((_x, i) => {
    return { value: values[i], targetX: i, x: i }
  })
  const boxes = array.slice()
  const updateTarget = () => {
    for (let i = 0; i < n; i++) {
      array[i].targetX = i
    }
  }
  rng.shuffle(array)
  updateTarget()

  const snap = () => {
    frames.push(boxes.map((x) => x.x))
  }
  snap()

  const update = () => {
    let diff = 0
    for (let i = 0; i < n; i++) {
      const dx = (array[i].targetX - array[i].x) / 32
      array[i].x += dx
      diff += Math.abs(dx)
    }
    snap()
    return diff
  }

  const updateAnimation = () => {
    updateTarget()
    for (let t = 0; t < 28; t++) {
      update()
    }
  }

  for (let i = 1; i < array.length; i++) {
    let j = i
    while (j > 0) {
      if (array[j].value >= array[j - 1].value) {
        break
      } else {
        ;[array[j], array[j - 1]] = [array[j - 1], array[j]]
        j -= 1
        updateAnimation()
      }
    }
  }
  while (update() > 0.0001) {
    // Keep rendering.
  }

  return {
    getBoxValue: (boxNumber: number) => {
      return boxes[boxNumber].value
    },
    getBoxPositionAtFrame: (boxNumber: number, frame: number) => {
      const i = Math.max(0, Math.min(frames.length - 1, frame))
      return frames[i][boxNumber]
    },
  }
}

const notes = [-8, 16, 0, 9, -1, 4, 5, -3, 8, 14, 20, 21, 19, 17, 12, 2, 11]

function createGroupSortingAnimation(values: number[]) {
  const frames: number[][] = []
  const actives: number[] = []
  const sortedFrame: number[] = []
  let active: number | null = null
  let sorted = 0
  const n = values.length
  const array = values.map((value, i) => ({
    value,
    targetX: i,
    x: i,
    boxIndex: i,
  }))
  const boxes = array.slice()
  const updateTarget = () => {
    for (let i = 0; i < n; i++) {
      array[i].targetX = i
    }
  }
  const snap = () => {
    frames.push(boxes.map((x) => x.x))
    actives.push(active)
    sortedFrame.push(sorted)
  }
  const update = () => {
    let diff = 0
    for (let i = 0; i < n; i++) {
      const dx = (array[i].targetX - array[i].x) / 16
      array[i].x += dx
      diff += Math.abs(dx)
    }
    snap()
    return diff
  }
  const updateAnimation = (targetFrames: number) => {
    updateTarget()
    while (frames.length < targetFrames) {
      update()
    }
  }
  snap()

  let readCount = 0
  const render = () => {
    const targetFrame = ((++readCount * 60) / 108 / 2 / 2) * 60
    updateAnimation(targetFrame)
  }
  const read = (i: number) => {
    active = array[i].boxIndex
    const value = array[i].value
    render()
    active = null
    return value
  }
  render()

  for (let i = 1; i < array.length; i++) {
    let j = i
    sorted = i
    while (j > 0) {
      if (read(j) <= read(j - 1)) {
        break
      } else {
        ;[array[j], array[j - 1]] = [array[j - 1], array[j]]
        j -= 1
      }
    }
  }
  while (update() > 0.0001) {
    // Keep rendering.
  }
  console.log('f', frames)

  sortedFrame[0] = -1
  return {
    applyTo(frame: number, groups: Group[]) {
      const i = Math.max(0, Math.min(frames.length - 1, frame))
      const xs = frames[i]
      groups.forEach((g, j) => {
        g.setPosition(xs[j])
        g.setHighlight(
          j === actives[i] ? 'active' : j <= sortedFrame[i] ? 'sorted' : null,
        )
      })
    },
  }
}

type Highlight = 'sorted' | 'active' | null

type Group = {
  setPosition: (index: number) => void
  setHighlight: (active: Highlight) => void
}

const groupSortingAnimation = createGroupSortingAnimation(notes)

const groups = notes.map((note, row): Group => {
  const maxHeight = 0.2 + (note + 10) / 32
  const columns = 16
  const anim = createSortingAnimation(columns)
  const z = -(row - 8) * 1.41
  const group = new THREE.Group()
  group.position.z = z
  group.position.x = -note / 256
  const boxes: ReturnType<typeof createBox>[] = []
  for (let i = 0; i < columns; i++) {
    const value = anim.getBoxValue(i)
    const box = createBox(0, -value / 256, (value * 0.75 + 1) * maxHeight)
    onFrame.push((f) => {
      box.x = (anim.getBoxPositionAtFrame(i, f) - (columns - 1) / 2) * 1.41
    })
    group.add(box.mesh)
    boxes.push(box)
  }
  scene.add(group)
  return {
    setPosition: (row) => {
      const z = -(row - 8) * 1.41
      group.position.z = z
    },
    setHighlight: (highlight) => {
      boxes[boxes.length - 1].setHighlight(highlight)
    },
  }
})

onFrame.push((frame) => {
  const start = Math.floor((60 / 108 / 2) * 5 * 4 * 60)
  groupSortingAnimation.applyTo(frame - start, groups)
})

function createCameraAnimation() {
  const frames: ((c: THREE.PerspectiveCamera) => void)[] = []

  function render(
    n: number,
    start: THREE.Vector3,
    lookAt1: THREE.Vector3,
    damp: number,
    end: THREE.Vector3 = start,
    lookAt2: THREE.Vector3 = lookAt1,
  ) {
    let current = start.clone()
    let lookAt = lookAt1.clone()
    for (let i = 0; i < n; i++) {
      current.x += (end.x - current.x) / damp
      current.y += (end.y - current.y) / damp
      current.z += (end.z - current.z) / damp
      lookAt.x += (lookAt2.x - lookAt.x) / damp
      lookAt.y += (lookAt2.y - lookAt.y) / damp
      lookAt.z += (lookAt2.z - lookAt.z) / damp
      const position = current.clone()
      const lookAtPosition = lookAt.clone()
      frames.push((c) => {
        c.position.copy(position)
        c.lookAt(lookAtPosition)
      })
    }
  }

  render(
    (((5 / 2) * 60) / 108) * 60,
    new THREE.Vector3(0, 0, -4),
    new THREE.Vector3(0, 3, -12),
    64,
    new THREE.Vector3(0, 12, 24),
  )
  render(
    (((5 / 2) * 60) / 108) * 60,
    new THREE.Vector3(-16, 10, 8),
    new THREE.Vector3(0, 5, 0),
    64,
    new THREE.Vector3(-16, 10, -8),
  )
  render(
    (((5 / 2) * 60) / 108) * 60 * 2 + ((3 * 60) / 108) * 60 * 4,
    new THREE.Vector3(-9, 16, -16),
    new THREE.Vector3(-2, 7, 0),
    64,
    new THREE.Vector3(22, 7, 0),
  )
  render(
    ((3 * 60) / 108) * 60 * 4,
    new THREE.Vector3(17, 6, 16),
    new THREE.Vector3(-16, 7, -8),
    256,
    new THREE.Vector3(20, 8, 10),
  )
  render(
    ((3 * 60) / 108) * 60 * 4,
    new THREE.Vector3(18, 16, -16),
    new THREE.Vector3(0, 0, 0),
    256,
    new THREE.Vector3(22, 8, 10),
    new THREE.Vector3(0, 9, 0),
  )
  render(
    ((3 * 60) / 108) * 60 * 1,
    new THREE.Vector3(25, 8, 0),
    new THREE.Vector3(0, 7, 0),
    128,
    new THREE.Vector3(18, 7, 0),
    new THREE.Vector3(0, 8, 0),
  )
  const tr = new THREE.Vector3(2, 0, 2)
  render(
    ((3 * 60) / 108) * 60 * 1,
    new THREE.Vector3(16, 5.5, -14).add(tr),
    new THREE.Vector3(-4, 5.5, 2).add(tr),
    128,
    new THREE.Vector3(16, 5.5, -14).sub(tr),
    new THREE.Vector3(-4, 5.5, 2).sub(tr),
  )
  render(
    ((3 * 60) / 108) * 60 * 1,
    new THREE.Vector3(7, 25, 0),
    new THREE.Vector3(2, 0, 0),
    128,
    new THREE.Vector3(30, 5, 0),
    new THREE.Vector3(0, 5, 0),
  )
  render(
    ((3 * 60) / 108) * 60 * 2,
    new THREE.Vector3(20, 6, -4),
    new THREE.Vector3(0, 6, -4),
    256,
    new THREE.Vector3(20, 8, 4),
    new THREE.Vector3(0, 8, 4),
  )
  render(
    ((3 * 60) / 108) * 60 * 2,
    new THREE.Vector3(10, 7, 0),
    new THREE.Vector3(0, 7, 0),
    8,
    new THREE.Vector3(22, 7, 0),
    new THREE.Vector3(0, 7, 0),
  )

  return {
    applyToCamera: (frame: number, camera: THREE.PerspectiveCamera) => {
      const i = Math.max(0, Math.min(frames.length - 1, frame))
      frames[i](camera)
    },
  }
}

export const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000)
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

const cameraAnimation = createCameraAnimation()
onFrame.push((f) => {
  cameraAnimation.applyToCamera(f, camera)
})

const saoPass = new SAOPass(scene, camera, false, true)
// composer.addPass(saoPass)
saoPass.params.output = (SAOPass.OUTPUT as any).Default
saoPass.params.saoBias = 0.9
saoPass.params.saoScale = 10
saoPass.params.saoIntensity = 0.01

export function renderAnimation(frameNumber: number) {
  for (const f of onFrame) {
    f(frameNumber)
  }
  composer.render()
}
