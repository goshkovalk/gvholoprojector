'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'
import dynamic from 'next/dynamic'
import { FileUp, Image as ImageIcon, Loader2, Shapes, SlidersHorizontal, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_SETTINGS,
  IMAGE_EXTENSIONS,
  MODEL_EXTENSIONS,
  type HoloSettings,
  type HoloSource,
} from '@/lib/hologram/types'
import { isSupported, loadFile, loadImageSource } from '@/lib/hologram/load-file'
import { createDemoObject } from '@/lib/hologram/geometry'
import { ControlPanel } from './control-panel'

const HologramScene = dynamic(() => import('./hologram-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading 3D viewer</span>
    </div>
  ),
})

const ACCEPT = [...IMAGE_EXTENSIONS, ...MODEL_EXTENSIONS].map((e) => `.${e}`).join(',')

function demoSource(): HoloSource {
  return { kind: 'model', name: 'Demo shape', object: createDemoObject() }
}

export function HologramApp() {
  const [source, setSource] = useState<HoloSource>(demoSource)
  const [settings, setSettings] = useState<HoloSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const resetView = () => setResetKey((k) => k + 1)
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const updateSettings = useCallback((patch: Partial<HoloSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleFiles = useCallback(async (files: FileList | null) => {
    const file = files && Array.from(files).find((f) => isSupported(f.name))
    if (!file) {
      if (files?.length) setError('Unsupported file. Try an image (PNG, JPG…) or a 3D model (GLB, OBJ, STL…).')
      return
    }
    setLoading(true)
    setError(null)
    try {
      setSource(await loadFile(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSamplePhoto = async () => {
    setLoading(true)
    setError(null)
    try {
      setSource(await loadImageSource('/samples/astronaut.png', 'astronaut.png'))
      updateSettings({ cutoff: 0.08, depth: 0.45 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sample')
    } finally {
      setLoading(false)
    }
  }

  const snapshot = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `hologram-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-background"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <div className="absolute inset-0">
        <HologramScene
          source={source}
          settings={settings}
          resetKey={resetKey}
          onCanvas={(c) => {
            canvasRef.current = c
          }}
        />
      </div>

      {!settings.pyramid && (
        <header className="pointer-events-none absolute left-0 top-0 flex flex-col gap-1 p-5 md:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            Holo/Projector
          </p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
            Turn anything into a hologram
          </h1>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">
            Drop a photo or a 3D model. Drag to spin it 360°, scroll to zoom.
          </p>
        </header>
      )}

      <aside
        className={cn(
          'absolute z-10 flex flex-col overflow-hidden border border-border bg-card/70 backdrop-blur-xl',
          'inset-x-3 bottom-24 max-h-[60dvh] rounded-2xl md:inset-x-auto md:bottom-auto md:right-6 md:top-6 md:max-h-[calc(100dvh-3rem)] md:w-80',
          panelOpen ? 'flex' : 'hidden md:flex',
        )}
        aria-label="Hologram controls"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium">Controls</h2>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Close controls"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          <ControlPanel
            settings={settings}
            source={source}
            onChange={updateSettings}
            onReset={() => {
              setSettings(DEFAULT_SETTINGS)
              resetView()
            }}
            onResetView={resetView}
            onSnapshot={snapshot}
          />
        </div>
      </aside>

      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 md:p-6">
        <div className="flex w-full max-w-xl flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/70 p-2 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              Upload
            </button>
            <div className="flex min-w-0 flex-1 flex-col px-1">
              <span className="truncate text-sm">{source.name}</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {source.kind === 'image' ? 'Photo → 3D relief' : '3D model'}
              </span>
            </div>
            <button
              type="button"
              onClick={loadSamplePhoto}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Load sample photo"
              title="Sample photo"
            >
              <ImageIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSource(demoSource())}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Load demo 3D shape"
              title="Demo shape"
            >
              <Shapes className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
              aria-label="Toggle controls"
              aria-expanded={panelOpen}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary px-12 py-10 text-center">
            <FileUp className="size-8 text-primary" aria-hidden="true" />
            <p className="text-lg font-medium">Drop to project</p>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {IMAGE_EXTENSIONS.join(' · ')} — {MODEL_EXTENSIONS.join(' · ')}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
