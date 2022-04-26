import * as THREE from 'three'

export const w = 1920
export const h = 1080

export const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(w, h)
document.getElementById('scene').appendChild(renderer.domElement)
