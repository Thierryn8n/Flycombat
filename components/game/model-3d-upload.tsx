'use client'

import { useState, useRef } from 'react'

interface Model3DUploadProps {
  aircraftId: string
  onUploadSuccess?: (aircraft: any) => void
  onClose?: () => void
}

export default function Model3DUpload({ aircraftId, onUploadSuccess, onClose }: Model3DUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [modelCode, setModelCode] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedFormats = ['.obj', '.fbx', '.gltf', '.glb']

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      if (allowedFormats.includes(extension)) {
        setSelectedFile(file)
        setModelCode('')
      } else {
        alert('Formato de arquivo não suportado. Use: .obj, .fbx, .gltf, .glb')
        event.target.value = ''
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile && !modelCode.trim()) {
      alert('Por favor, selecione um arquivo ou insira o código do modelo')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('aircraftId', aircraftId)
      
      if (selectedFile) {
        formData.append('modelFile', selectedFile)
      } else {
        formData.append('modelCode', modelCode)
      }

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`/api/aircrafts/${aircraftId}/3d-model`, {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const result = await response.json()
      
      setTimeout(() => {
        onUploadSuccess?.(result.aircraft)
        setIsUploading(false)
        setUploadProgress(0)
        setSelectedFile(null)
        setModelCode('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 500)

    } catch (error) {
      console.error('Erro no upload:', error)
      alert(error instanceof Error ? error.message : 'Erro ao fazer upload do modelo')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4">Upload de Modelo 3D</h3>
      
      <div className="space-y-4">
        {/* Upload de arquivo */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Arquivo 3D ({allowedFormats.join(', ')})
          </label>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".obj,.fbx,.gltf,.glb"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isUploading}
            >
              Selecionar Arquivo
            </button>
            {selectedFile && (
              <span className="text-sm text-slate-300">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
          </div>
        </div>

        {/* Ou código manual */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-800 text-slate-400">ou</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Código do Modelo 3D
          </label>
          <textarea
            value={modelCode}
            onChange={(e) => setModelCode(e.target.value)}
            placeholder="Cole o código do modelo 3D aqui..."
            className="w-full h-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading || selectedFile !== null}
          />
        </div>

        {/* Barra de progresso */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-300">
              <span>Enviando modelo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            disabled={isUploading || (!selectedFile && !modelCode.trim())}
          >
            {isUploading ? 'Enviando...' : 'Enviar Modelo'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
              disabled={isUploading}
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Formatos suportados */}
        <div className="text-xs text-slate-400">
          Formatos suportados: OBJ, FBX, glTF, GLB (máximo 10MB)
        </div>
      </div>
    </div>
  )
}