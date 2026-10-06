import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

const ENVIRONMENT_URL = '/environments/studio.hdr'

const PAINT_PATTERN = /body|paint|carpaint|exterior/i

// Les swatches de la base ne sont pas toujours des couleurs exploitables : la
// teinte « BMW Individual » stocke un `conic-gradient` CSS pour l'aperçu web.
// On n'accepte donc que du hexadécimal, et silencieusement.
const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Repère les matériaux de carrosserie à peindre. Un GLB peut nommer soit le
 * mesh, soit le matériau : le nom du matériau prime, et celui du mesh ne sert
 * que de repli pour un matériau anonyme. Sans cette hiérarchie, un mesh
 * multi-matériaux nommé « body » verrait saentire garniture peinte aussi.
 */
function collectPaintMaterials(model) {
  const materials = []
  if (!model) return materials

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return
    const meshMatches = PAINT_PATTERN.test(child.name || '')
    const list = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of list) {
      if (!material || !material.isMeshStandardMaterial) continue
      const named = (material.name || '').trim()
      if (named ? PAINT_PATTERN.test(named) : meshMatches) materials.push(material)
    }
  })

  return materials
}

function applyBodyColor(model, hexColor) {
  if (!model || typeof hexColor !== 'string') return
  const value = hexColor.trim()
  if (!HEX_COLOR_PATTERN.test(value)) return

  const color = new THREE.Color(value)
  if (!Number.isFinite(color.getHex())) return
  for (const material of collectPaintMaterials(model)) {
    material.color.copy(color)
    material.needsUpdate = true
  }
}

function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value && value.isTexture) value.dispose()
  }
  material.dispose()
}

function disposeObject(root) {
  if (!root) return
  root.traverse((child) => {
    if (!child.isMesh) return
    child.geometry?.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      if (material) disposeMaterial(material)
    }
  })
}

/**
 * Cadrage automatique : le modèle est centré, puis reculé juste assez pour
 * tenir dans le champ de vision. L'intérieur est cadré beaucoup plus serré.
 * La caméra risultante est mémorisée afin de être restaurée à l'identique
 * quand on revient sur un mode déjà chargé.
 */
function frameModel(model, camera, controls, { interior }) {
  const box = new THREE.Box3().setFromObject(model)
  const sphere = box.getBoundingSphere(new THREE.Sphere())

  model.position.sub(sphere.center)
  model.updateMatrixWorld(true)

  const fov = THREE.MathUtils.degToRad(camera.fov)
  const fit = sphere.radius / Math.sin(fov / 2)
  const distance = interior ? Math.max(fit * 0.18, 0.6) : fit * 1.45
  const direction = interior
    ? new THREE.Vector3(0.55, 0.35, 0.75)
    : new THREE.Vector3(0.9, 0.42, 1).normalize()

  camera.position.copy(direction).multiplyScalar(distance)
  camera.near = Math.max(sphere.radius / 1000, 0.01)
  camera.far = sphere.radius * 100 + 1000
  camera.updateProjectionMatrix()

  controls.target.set(0, 0, 0)
  controls.minDistance = interior ? distance * 0.3 : sphere.radius * 0.8
  controls.maxDistance = interior ? distance * 2.5 : fit * 4
  controls.update()

  return {
    position: camera.position.clone(),
    target: controls.target.clone(),
  }
}

/**
 * Cycle de vie complet d'une scène Three.js pour la vue 360°.
 *
 * Tout est regroupé ici pour que la libération des ressources soit
 * vérifiable en un seul endroit. React 19 + StrictMode montent, démontent puis
 * remontent le composant en développement : chaque ressource est donc libérée
 * de façon idempotente, y compris le contexte WebGL via `forceContextLoss`,
 * sinon le navigateur finit par tuer le contexte après quelques ouvertures.
 *
 * Les URLs des modèles glTF sont fournies par le véhicule (assignation par
 * véhicule) et non plus par des constantes : elles peuvent donc changer ou
 * être absentes. `null`/`undefined` ne doit JAMAIS atteindre `GLTFLoader`.
 */
export function useThreeScene({
  mode = 'out',
  bodyColor = null,
  active = true,
  exteriorModelUrl = null,
  interiorModelUrl = null,
}) {
  const containerRef = useRef(null)
  const [exteriorStatus, setExteriorStatus] = useState('idle')
  const [interiorStatus, setInteriorStatus] = useState('idle')

  const sceneRef = useRef(null)
  const modelsRef = useRef({ out: null, in: null })
  const tokenRef = useRef(0)
  const bodyColorRef = useRef(bodyColor)

  // Miroir de la couleur courante pour que le callback de chargement lise la
  // dernière valeur sans en dépendre : changer de peinture ne doit pas
  // recharger le modèle.
  useEffect(() => {
    bodyColorRef.current = bodyColor
  }, [bodyColor])

  // 1. Scène, caméra, renderer, contrôles, boucle de rendu, environnement.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !active) return undefined

    let disposed = false
    let frameId = 0
    let renderer = null
    let envTexture = null
    let pmrem = null
    const attached = { model: null }
    // Capture locale : le cache doit être vidé à la destruction, mais on ne
    // veut pas relire un ref au moment du nettoyage.
    const models = modelsRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0b0b0f')

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000)
    camera.position.set(3, 1.4, 4)

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setExteriorStatus('error')
      return undefined
    }
    if (!renderer.getContext()) {
      renderer.dispose?.()
      setExteriorStatus('error')
      return undefined
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.className = 'block h-full w-full touch-none'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minPolarAngle = 0.15
    // Borne basse un peu sous l'horizon : au-delà la caméra passe sous le sol
    // et l'auto-rotation paraît cassée.
    controls.maxPolarAngle = Math.PI / 2 + 0.25

    const ambient = new THREE.AmbientLight(0xffffff, 0.55)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(4, 6, 3)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.5)
    fill.position.set(-5, 3, -4)
    scene.add(fill)

    const resize = () => {
      const { clientWidth, clientHeight } = container
      if (!clientWidth || !clientHeight) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = () => {
      frameId = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(tick)

    // Environnement HDR : facultatif. Sans le fichier, l'éclairage
    // analytique suffit et la vue extérieure reste parfaitement utilisable.
    if (typeof RGBELoader === 'function') {
      pmrem = new THREE.PMREMGenerator(renderer)
      new RGBELoader().load(
        ENVIRONMENT_URL,
        (texture) => {
          if (disposed || !pmrem) {
            texture.dispose()
            return
          }
          texture.mapping = THREE.EquirectangularReflectionMapping
          envTexture = pmrem.fromEquirectangular(texture)
          scene.environment = envTexture.texture
          texture.dispose()
          // L'IBL prend le relais : on baisse les lumières analytiques.
          ambient.intensity = 0.25
          key.intensity = 0.6
          fill.intensity = 0.3
        },
        undefined,
        () => {
          // Fichier absent ou invalide : on garde l'éclairage par défaut.
        },
      )
    }

    sceneRef.current = {
      camera,
      controls,
      loader: new GLTFLoader(),
      attach(model) {
        if (attached.model && attached.model !== model) {
          scene.remove(attached.model)
        }
        attached.model = model
        if (model) scene.add(model)
      },
    }

    return () => {
      disposed = true
      tokenRef.current += 1
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      controls.dispose()

      if (attached.model) scene.remove(attached.model)
      attached.model = null

      for (const key of ['out', 'in']) {
        const entry = models[key]
        if (entry) {
          disposeObject(entry.object)
          models[key] = null
        }
      }

      scene.environment = null
      envTexture?.dispose?.()
      envTexture = null
      pmrem?.dispose?.()
      pmrem = null

      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      sceneRef.current = null
    }
  }, [active])

  // 1bis. Invalidation du cache de modèles quand les URLs changent.
  //
  // `modelsRef` est indexé par mode (`out`/`in`) et non par URL : sans cette
  // remise à zéro, un véhicule qui change de modèle réutiliserait celui du
  // précédent. On détache avant de libérer, sinon un rendu pourrait porter une
  // géométrie déjà disposée. L'objet lui-même est muté (et non remplacé) car
  // l'effet de scène en conserve une référence locale pour son nettoyage.
  useEffect(() => {
    const models = modelsRef.current
    if (!models.out && !models.in) return undefined

    const ctx = sceneRef.current
    if (ctx) ctx.attach(null)

    for (const key of ['out', 'in']) {
      if (!models[key]) continue
      disposeObject(models[key].object)
      models[key] = null
    }
    return undefined
  }, [exteriorModelUrl, interiorModelUrl])

  // 2. Modèle du mode courant. Les modèles déjà chargés sont conservés en
  //    cache et simplement réattachés : revenir de l'intérieur à l'extérieur
  //    ne re-télécharge rien.
  useEffect(() => {
    if (!active) return undefined
    const ctx = sceneRef.current
    if (!ctx) return undefined
    const { loader } = ctx

    const interior = mode === 'in'
    const setStatus = interior ? setInteriorStatus : setExteriorStatus

    // Contrainte : ne jamais appeler GLTFLoader avec une URL nulle. Un
    // véhicule sans modèle passe en `error`, ce qui déclenche l'écran
    // existant « modèle non disponible » — exactement le comportement d'un
    // fichier introuvable, donc aucune régression.
    const url = interior ? interiorModelUrl : exteriorModelUrl
    if (!url) {
      setStatus('error')
      return undefined
    }

    const cached = modelsRef.current[mode]
    if (cached) {
      ctx.attach(cached.object)
      ctx.camera.position.copy(cached.view.position)
      ctx.controls.target.copy(cached.view.target)
      ctx.controls.update()
      ctx.controls.autoRotate = !interior
      applyBodyColor(cached.object, bodyColorRef.current)
      setStatus('ready')
      return undefined
    }

    setStatus('loading')
    const token = tokenRef.current + 1
    tokenRef.current = token

    loader.load(
      url,
      (gltf) => {
        if (tokenRef.current !== token) {
          disposeObject(gltf.scene)
          return
        }
        const view = frameModel(gltf.scene, ctx.camera, ctx.controls, { interior })
        modelsRef.current[mode] = { object: gltf.scene, view }
        ctx.attach(gltf.scene)
        applyBodyColor(gltf.scene, bodyColorRef.current)
        ctx.controls.autoRotate = !interior
        ctx.controls.update()
        setStatus('ready')
      },
      undefined,
      () => {
        if (tokenRef.current !== token) return
        setStatus('error')
      },
    )

    // Invalidation : un chargement en cours ne doit plus être pris en compte
    // après un changement de mode, de modèle ou un démontage. three.js
    // n'expose pas d'annulation, le jeton suffit à ignorer la réponse tardive.
    return () => {
      tokenRef.current += 1
    }
  }, [mode, active, exteriorModelUrl, interiorModelUrl])

  // 3. Changement de peinture, sans recharger le modèle.
  useEffect(() => {
    const entry = modelsRef.current[mode]
    if (entry) applyBodyColor(entry.object, bodyColor)
  }, [bodyColor, mode])

  return {
    containerRef,
    exteriorStatus,
    interiorStatus,
    // Sans URL intérieure, l'intérieur est indisponible DÈS LE DÉPART et non
    // après un chargement voué à l'échec : le bouton « Intérieur » bascule
    // immédiatement sur le message d'indisponibilité.
    interiorAvailable: Boolean(interiorModelUrl) && interiorStatus !== 'error',
    exteriorFailed: exteriorStatus === 'error',
  }
}

export { applyBodyColor }
