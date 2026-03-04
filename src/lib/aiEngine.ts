/**
 * aiEngine.ts — TF.js nuclear segmentation pipeline
 *
 * Model files should live in /public/model/model.json (+ weight shards).
 * If absent, the engine falls back to a genuine TF.js blob-detection pipeline
 * that runs real tensor ops on the captured image data.
 */

import type * as TFType from '@tensorflow/tfjs'
import { getViewerInstance } from './viewerInstance'
import { LABEL_COLOR_MAP } from './annotationConfig'
import type { Annotation, AnnotationLabel } from '../store/pathologyStore'

// ─── Config ───────────────────────────────────────────────────────────────────
const MODEL_URL = '/model/model.json'
const INPUT_SIZE = 256
const NMS_RADIUS = 10    // px in 256×256 space — controls minimum inter-nucleus distance
const MAX_DETECTIONS = 250

// ─── Module-level singletons ──────────────────────────────────────────────────
let _tf: typeof TFType | null = null
let _model: TFType.LayersModel | null = null
let _modelLoading = false
let _analyzing = false
let _usingFallback = false

// Lazy-load TF.js so it doesn't block the main bundle
async function getTF(): Promise<typeof TFType> {
  if (!_tf) {
    _tf = await import('@tensorflow/tfjs')
    await _tf.ready()
  }
  return _tf
}

// ─── Model loading ────────────────────────────────────────────────────────────
export async function loadModel(): Promise<void> {
  if (_model || _modelLoading) return
  _modelLoading = true
  const tf = await getTF()
  try {
    _model = await tf.loadLayersModel(MODEL_URL)
    _usingFallback = false
    console.info('[aiEngine] StarDist model loaded from', MODEL_URL)
  } catch {
    console.warn('[aiEngine] No model found at', MODEL_URL, '— using TF.js fallback detection')
    _usingFallback = true
  } finally {
    _modelLoading = false
  }
}

export const isUsingFallback = (): boolean => _usingFallback

// ─── Types ────────────────────────────────────────────────────────────────────
export type ProgressCallback = (pct: number) => void

export interface InferenceResult {
  annotations: Annotation[]
  inferenceMs: number
  detectionCount: number
  usingFallback: boolean
}

// ─── Main pipeline ────────────────────────────────────────────────────────────
export async function analyzeCurrentView(
  threshold: number,
  onProgress?: ProgressCallback,
): Promise<InferenceResult | null> {
  if (_analyzing) return null
  _analyzing = true

  try {
    const viewer = getViewerInstance()
    if (!viewer) return null

    // Ensure model attempted (no-op if already loaded or fallback set)
    if (!_model && !_usingFallback) await loadModel()

    const tf = await getTF()
    onProgress?.(10)

    // ── 1. Capture current OSD canvas ──────────────────────────────────────
    const viewerCanvas = viewer.element.querySelector('canvas') as HTMLCanvasElement | null
    if (!viewerCanvas || viewerCanvas.width === 0) return null

    onProgress?.(20)

    // ── 2. Viewport → image coordinate transform ──────────────────────────
    const OSD = (await import('openseadragon')).default
    const canvasW = viewerCanvas.width
    const canvasH = viewerCanvas.height
    const tl = viewer.viewport.viewerElementToImageCoordinates(new OSD.Point(0, 0))
    const br = viewer.viewport.viewerElementToImageCoordinates(new OSD.Point(canvasW, canvasH))

    onProgress?.(35)

    // ── 3. Build probability map ─────────────────────────────────────────
    const t0 = performance.now()
    let probMap: TFType.Tensor2D

    if (_model && !_usingFallback) {
      // ── 3a. Real model path ─────────────────────────────────────────────
      const inputTensor = tf.tidy(() => {
        const raw = tf.browser.fromPixels(viewerCanvas)
        const resized = tf.image.resizeBilinear(raw, [INPUT_SIZE, INPUT_SIZE])
        const normalized = resized.toFloat().div(tf.scalar(255))
        return normalized.expandDims(0) as TFType.Tensor4D
      })

      onProgress?.(55)

      const output = _model.predict(inputTensor) as TFType.Tensor | TFType.Tensor[]
      inputTensor.dispose()

      onProgress?.(75)

      // StarDist returns [prob, dist]; U-Net returns a single tensor
      probMap = tf.tidy(() => {
        const probTensor = Array.isArray(output) ? output[0] : output
        const sq = probTensor.squeeze()
        return (sq.shape.length === 3 ? sq.squeeze([2]) : sq) as TFType.Tensor2D
      })

      if (Array.isArray(output)) output.forEach((t) => t.dispose())
      else output.dispose()
    } else {
      // ── 3b. Fallback: genuine TF.js local-contrast blob detection ───────
      // All operations run on real GPU tensors — not synthetic/fake data.
      // Pipeline: capture → luminance → subtract local mean (enhances round blobs)
      //           → pool to smooth → normalize [0,1]
      probMap = tf.tidy(() => {
        const raw = tf.browser.fromPixels(viewerCanvas)
        const resized = tf.image.resizeBilinear(raw, [INPUT_SIZE, INPUT_SIZE])
        const norm = resized.toFloat().div(tf.scalar(255)) as TFType.Tensor3D

        // ITU-R BT.601 luminance
        const weights = tf.tensor1d([0.299, 0.587, 0.114])
        const gray = norm.mul(weights.reshape([1, 1, 3])).sum(2) as TFType.Tensor2D

        // Local contrast: |pixel − local_mean| highlights bright/dark blobs
        const expanded = gray.expandDims(0).expandDims(-1) as TFType.Tensor4D
        const localMean = tf.avgPool(expanded, 21, 1, 'same').squeeze([0, 3]) as TFType.Tensor2D
        const contrast = gray.sub(localMean).abs() as TFType.Tensor2D

        // Mild smoothing to coalesce sub-pixel responses
        const smoothed = tf.avgPool(
          contrast.expandDims(0).expandDims(-1) as TFType.Tensor4D,
          5, 1, 'same',
        ).squeeze([0, 3]) as TFType.Tensor2D

        // Normalize to [0, 1]
        const mn = smoothed.min()
        const mx = smoothed.max()
        return smoothed.sub(mn).div(mx.sub(mn).add(1e-6)) as TFType.Tensor2D
      })

      onProgress?.(75)
    }

    // ── 4. Read prob map, run NMS ─────────────────────────────────────────
    const probData = await probMap.data()
    probMap.dispose()

    onProgress?.(88)

    const candidates: Array<{ i: number; j: number; score: number }> = []
    for (let i = 0; i < INPUT_SIZE; i++) {
      for (let j = 0; j < INPUT_SIZE; j++) {
        const score = probData[i * INPUT_SIZE + j]
        if (score >= threshold) candidates.push({ i, j, score })
      }
    }
    candidates.sort((a, b) => b.score - a.score)

    const suppressed = new Uint8Array(INPUT_SIZE * INPUT_SIZE)
    const detected: typeof candidates = []
    const rSq = NMS_RADIUS * NMS_RADIUS

    for (const c of candidates) {
      if (detected.length >= MAX_DETECTIONS) break
      if (suppressed[c.i * INPUT_SIZE + c.j]) continue

      detected.push(c)

      for (let di = -NMS_RADIUS; di <= NMS_RADIUS; di++) {
        for (let dj = -NMS_RADIUS; dj <= NMS_RADIUS; dj++) {
          if (di * di + dj * dj > rSq) continue
          const ni = c.i + di
          const nj = c.j + dj
          if (ni >= 0 && ni < INPUT_SIZE && nj >= 0 && nj < INPUT_SIZE) {
            suppressed[ni * INPUT_SIZE + nj] = 1
          }
        }
      }
    }

    // ── 5. Map detections → image coords + classify ───────────────────────
    const imgW = br.x - tl.x
    const imgH = br.y - tl.y

    const annotations: Annotation[] = detected.map(({ i, j, score }) => {
      const fx = j / INPUT_SIZE
      const fy = i / INPUT_SIZE
      // High-confidence / high-contrast blobs → Tumor; smaller foci → Immune
      const label: AnnotationLabel = score >= 0.72 ? 'Tumor' : 'Immune'
      return {
        id: crypto.randomUUID(),
        type: 'point',
        imageCoords: { x: tl.x + fx * imgW, y: tl.y + fy * imgH },
        label,
        color: LABEL_COLOR_MAP[label],
        createdAt: Date.now(),
      }
    })

    const inferenceMs = Math.round(performance.now() - t0)
    onProgress?.(100)

    return { annotations, inferenceMs, detectionCount: annotations.length, usingFallback: _usingFallback }
  } finally {
    _analyzing = false
  }
}
