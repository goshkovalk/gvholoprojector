'use client'

import type { ReactNode } from 'react'
import { Box, Camera, Crosshair, Grid3x3, Pyramid, RotateCcw, Sparkle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HoloSettings, HoloSource, RenderMode } from '@/lib/hologram/types'

const COLORS = [
  { name: 'Cyan', value: '#3be8ff' },
  { name: 'Azure', value: '#4d8dff' },
  { name: 'Mint', value: '#3dffb0' },
  { name: 'Magenta', value: '#ff4fd8' },
  { name: 'Amber', value: '#ffb23d' },
  { name: 'Red', value: '#ff4d5e' },
]

const MODES: { value: RenderMode; label: string; icon: typeof Box }[] = [
  { value: 'hologram', label: 'Solid', icon: Box },
  { value: 'points', label: 'Particles', icon: Sparkle },
  { value: 'wireframe', label: 'Wireframe', icon: Grid3x3 },
]

interface ControlPanelProps {
  settings: HoloSettings
  source: HoloSource
  onChange: (patch: Partial<HoloSettings>) => void
  onReset: () => void
  onResetView: () => void
  onSnapshot: () => void
}

export function ControlPanel({
  settings,
  source,
  onChange,
  onReset,
  onResetView,
  onSnapshot,
}: ControlPanelProps) {
  const isImage = source.kind === 'image'

  return (
    <div className="flex flex-col gap-6">
      <Section title="Render mode">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background/40 p-1">
          {MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ mode: value })}
              aria-pressed={settings.mode === value}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs transition-colors',
                settings.mode === value
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Projection color">
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ color: c.value })}
              aria-label={c.name}
              aria-pressed={settings.color === c.value}
              className={cn(
                'size-7 rounded-full border-2 transition-transform hover:scale-110',
                settings.color === c.value ? 'border-foreground' : 'border-transparent',
              )}
              style={{ backgroundColor: c.value, boxShadow: `0 0 12px ${c.value}80` }}
            />
          ))}
          <label className="relative ml-auto size-7 cursor-pointer overflow-hidden rounded-full border border-border">
            <span className="sr-only">Custom color</span>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="absolute -inset-2 size-12 cursor-pointer"
            />
          </label>
        </div>
      </Section>

      <Section title="Rotation">
        <Toggle
          label="Auto-rotate 360°"
          checked={settings.autoRotate}
          onChange={(v) => onChange({ autoRotate: v })}
        />
        <Slider
          label="Speed"
          value={settings.rotateSpeed}
          min={0.05}
          max={2.5}
          step={0.05}
          onChange={(v) => onChange({ rotateSpeed: v })}
          disabled={!settings.autoRotate}
        />
      </Section>

      {isImage && (
        <Section title="Photo to 3D">
          <Slider
            label="Depth"
            value={settings.depth}
            min={0}
            max={1.2}
            step={0.01}
            onChange={(v) => onChange({ depth: v })}
          />
          <Slider
            label="Remove dark background"
            value={settings.cutoff}
            min={0}
            max={0.6}
            step={0.01}
            onChange={(v) => onChange({ cutoff: v })}
          />
        </Section>
      )}

      <Section title="Effects">
        <Slider
          label="Original colors"
          value={settings.trueColor}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onChange({ trueColor: v })}
        />
        <Slider
          label="Scanlines"
          value={settings.scanlines}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onChange({ scanlines: v })}
        />
        <Slider
          label="Glitch"
          value={settings.glitch}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onChange({ glitch: v })}
        />
        <Slider
          label="Glow"
          value={settings.bloom}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => onChange({ bloom: v })}
          disabled={settings.pyramid}
        />
        {settings.mode === 'points' && (
          <Slider
            label="Particle size"
            value={settings.pointSize}
            min={0.3}
            max={3}
            step={0.05}
            onChange={(v) => onChange({ pointSize: v })}
          />
        )}
      </Section>

      <Section title="Display">
        <Toggle
          label="Pyramid hologram mode"
          description="4-view layout for a reflective pyramid placed on your screen"
          icon={<Pyramid className="size-4" aria-hidden="true" />}
          checked={settings.pyramid}
          onChange={(v) => onChange({ pyramid: v })}
        />
        <button
          type="button"
          onClick={onResetView}
          className="flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
        >
          <Crosshair className="size-4" aria-hidden="true" />
          Reset position
        </button>
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSnapshot}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
        >
          <Camera className="size-4" aria-hidden="true" />
          Snapshot
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', disabled && 'opacity-40')}>
      <span className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary disabled:cursor-not-allowed"
      />
    </label>
  )
}

function Toggle({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string
  description?: string
  icon?: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      {icon && <span className="text-primary">{icon}</span>}
      <span className="flex flex-1 flex-col">
        <span className="text-sm">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-background transition-transform',
            checked ? 'translate-x-4.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
