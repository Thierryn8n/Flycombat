'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface Aircraft3DViewerProps {
  modelCode: string
  aircraftName: string
  onLoading?: (loading: boolean) => void
}

export default function Aircraft3DViewer({ modelCode, aircraftName, onLoading }: Aircraft3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const aircraftRef = useRef<THREE.Group | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cameraPreset, setCameraPreset] = useState<'front' | 'side' | 'top' | 'default'>('default')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewerKey, setViewerKey] = useState(0)
  const [contextLost, setContextLost] = useState(false)

  // Inicializar cena Three.js
  useEffect(() => {
    if (!mountRef.current) return
    let renderer: THREE.WebGLRenderer | null = null

    try {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x1a1a1a)
      sceneRef.current = scene

      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      )
      camera.position.set(5, 3, 5)
      cameraRef.current = camera

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1
      rendererRef.current = renderer

      mountRef.current.appendChild(renderer.domElement)

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0x4080ff, 0.5)
    pointLight.position.set(-10, 5, -5)
    scene.add(pointLight)

    // Chão
    const groundGeometry = new THREE.PlaneGeometry(20, 20)
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2
    ground.receiveShadow = true
    scene.add(ground)

    // Controles de mouse
    let isMouseDown = false
    let mouseX = 0
    let mouseY = 0
    let targetRotationX = 0
    let targetRotationY = 0
    let currentRotationX = 0
    let currentRotationY = 0

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true
      mouseX = event.clientX
      mouseY = event.clientY
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return

      const deltaX = event.clientX - mouseX
      const deltaY = event.clientY - mouseY

      targetRotationY += deltaX * 0.01
      targetRotationX += deltaY * 0.01

      mouseX = event.clientX
      mouseY = event.clientY
    }

    const handleMouseUp = () => {
      isMouseDown = false
    }

    // Controles de toque para mobile
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        mouseX = event.touches[0].clientX
        mouseY = event.touches[0].clientY
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        event.preventDefault()
        const deltaX = event.touches[0].clientX - mouseX
        const deltaY = event.touches[0].clientY - mouseY

        targetRotationY += deltaX * 0.01
        targetRotationX += deltaY * 0.01

        mouseX = event.touches[0].clientX
        mouseY = event.touches[0].clientY
      }
    }

    // Zoom com scroll
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const zoom = event.deltaY * 0.01
      camera.position.multiplyScalar(1 + zoom * 0.1)
      camera.position.clampLength(2, 20)
    }

      const handleContextLost = (event: Event) => {
        event.preventDefault()
        setContextLost(true)
      }
      const handleContextRestored = () => {
        setContextLost(false)
        setViewerKey((k) => k + 1)
      }

      renderer.domElement.addEventListener('webglcontextlost', handleContextLost)
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored)
      renderer.domElement.addEventListener('mousedown', handleMouseDown)
      renderer.domElement.addEventListener('mousemove', handleMouseMove)
      renderer.domElement.addEventListener('mouseup', handleMouseUp)
      renderer.domElement.addEventListener('touchstart', handleTouchStart)
      renderer.domElement.addEventListener('touchmove', handleTouchMove)
      renderer.domElement.addEventListener('wheel', handleWheel)

    // Animação
    const animate = () => {
      requestAnimationFrame(animate)

      if (aircraftRef.current) {
        // Suavizar rotação
        currentRotationX += (targetRotationX - currentRotationX) * 0.1
        currentRotationY += (targetRotationY - currentRotationY) * 0.1

        aircraftRef.current.rotation.x = currentRotationX
        aircraftRef.current.rotation.y = currentRotationY

        // Animação de flutuação suave
        aircraftRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.1
      }

      renderer.render(scene, camera)
    }

      animate()

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        renderer?.domElement.removeEventListener('webglcontextlost', handleContextLost)
        renderer?.domElement.removeEventListener('webglcontextrestored', handleContextRestored)
        renderer?.domElement.removeEventListener('mousedown', handleMouseDown)
        renderer?.domElement.removeEventListener('mousemove', handleMouseMove)
        renderer?.domElement.removeEventListener('mouseup', handleMouseUp)
        renderer?.domElement.removeEventListener('touchstart', handleTouchStart)
        renderer?.domElement.removeEventListener('touchmove', handleTouchMove)
        renderer?.domElement.removeEventListener('wheel', handleWheel)
        
        if (mountRef.current && renderer?.domElement) {
          mountRef.current.removeChild(renderer.domElement)
        }
        renderer?.dispose()
      }
    } catch (err) {
      setError('Falha ao iniciar o viewer 3D')
      setIsLoading(false)
      onLoading?.(false)
      if (renderer?.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer?.dispose()
      return
    }
  }, [onLoading, viewerKey])

  // Carregar modelo 3D
  useEffect(() => {
    if (!sceneRef.current || !modelCode) return

    const loadModel = async () => {
      try {
        setIsLoading(true)
        setError(null)
        onLoading?.(true)

        // Remover modelo anterior
        if (aircraftRef.current) {
          sceneRef.current.remove(aircraftRef.current)
        }

        // Criar modelo básico se não houver código customizado
        const aircraft = new THREE.Group()

        if (modelCode) {
          // Aqui você pode adicionar parsing do código 3D customizado
          // Por enquanto, criamos um modelo básico representativo
        }

        // Corpo principal
        const fuselageGeometry = new THREE.CylinderGeometry(0.3, 0.1, 3, 8)
        const fuselageMaterial = new THREE.MeshPhongMaterial({ color: 0x4a90e2 })
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial)
        fuselage.rotation.z = Math.PI / 2
        fuselage.castShadow = true
        aircraft.add(fuselage)

        // Asas
        const wingGeometry = new THREE.BoxGeometry(2, 0.05, 0.5)
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x357abd })
        const wings = new THREE.Mesh(wingGeometry, wingMaterial)
        wings.position.z = 0.5
        wings.castShadow = true
        aircraft.add(wings)

        // Canards
        const canardGeometry = new THREE.BoxGeometry(0.8, 0.03, 0.3)
        const canards = new THREE.Mesh(canardGeometry, wingMaterial)
        canards.position.z = -0.8
        canards.castShadow = true
        aircraft.add(canards)

        // Rabo
        const tailGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.05)
        const tail = new THREE.Mesh(tailGeometry, wingMaterial)
        tail.position.z = 1.2
        tail.castShadow = true
        aircraft.add(tail)

        // Motores
        const engineGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 8)
        const engineMaterial = new THREE.MeshPhongMaterial({ color: 0x2c5aa0 })
        
        const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial)
        leftEngine.position.set(0, -0.3, 0.8)
        leftEngine.rotation.z = Math.PI / 2
        leftEngine.castShadow = true
        aircraft.add(leftEngine)

        const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial)
        rightEngine.position.set(0, 0.3, 0.8)
        rightEngine.rotation.z = Math.PI / 2
        rightEngine.castShadow = true
        aircraft.add(rightEngine)

        aircraftRef.current = aircraft
        sceneRef.current.add(aircraft)

        setIsLoading(false)
        onLoading?.(false)

      } catch (err) {
        console.error('Erro ao carregar modelo 3D:', err)
        setError('Erro ao carregar modelo 3D')
        setIsLoading(false)
        onLoading?.(false)
      }
    }

    loadModel()
  }, [modelCode, aircraftName, onLoading, viewerKey])

  // Controles de câmera
  const setCameraPosition = (preset: string) => {
    if (!cameraRef.current) return

    const camera = cameraRef.current
    
    switch (preset) {
      case 'front':
        camera.position.set(0, 0, 8)
        break
      case 'side':
        camera.position.set(8, 0, 0)
        break
      case 'top':
        camera.position.set(0, 8, 0)
        break
      default:
        camera.position.set(5, 3, 5)
    }
    
    camera.lookAt(0, 0, 0)
  }

  useEffect(() => {
    setCameraPosition(cameraPreset)
  }, [cameraPreset])

  const toggleFullscreen = () => {
    if (!mountRef.current) return

    if (!isFullscreen) {
      if (mountRef.current.requestFullscreen) {
        mountRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    
    setIsFullscreen(!isFullscreen)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center text-red-400">
          <div className="text-2xl mb-2">⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-center text-white">
            <div className="animate-spin text-4xl mb-2">✈️</div>
            <div>Carregando modelo 3D...</div>
          </div>
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center text-white space-y-3">
            <div className="text-lg">WebGL pausado</div>
            <div className="text-xs text-slate-300">O contexto 3D foi perdido.</div>
            <button
              onClick={() => {
                setContextLost(false)
                setViewerKey((k) => k + 1)
              }}
              className="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
            >
              Recarregar 3D
            </button>
          </div>
        </div>
      )}

      {/* Controles de câmera */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setCameraPreset('front')}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Frente
        </button>
        <button
          onClick={() => setCameraPreset('side')}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Lado
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Topo
        </button>
        <button
          onClick={() => setCameraPreset('default')}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Padrão
        </button>
      </div>

      {/* Controles adicionais */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
        >
          {isFullscreen ? 'Sair' : 'Fullscreen'}
        </button>
      </div>

      {/* Instruções */}
      <div className="absolute bottom-4 left-4 text-white text-xs opacity-75">
        <div>🖱️ Clique e arraste para rotacionar</div>
        <div>📱 Toque e arraste no mobile</div>
        <div>🔍 Scroll para zoom</div>
      </div>
    </div>
  )
}
