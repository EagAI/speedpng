import { useState, useRef, useCallback, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './ImageUploader.css'

type UploadState = 'idle' | 'preview' | 'scanning' | 'uploading' | 'done' | 'error'

interface NsfwPrediction { className: string; probability: number }
interface NsfwModel { classify(img: HTMLImageElement): Promise<NsfwPrediction[]> }
interface NsfwJSLib { load(): Promise<NsfwModel> }

// Loaded from CDN (see index.html) — not bundled
declare const nsfwjs: NsfwJSLib

let nsfwModel: NsfwModel | null = null
async function getNsfwModel(): Promise<NsfwModel> {
  if (!nsfwModel) {
    nsfwModel = await nsfwjs.load()
  }
  return nsfwModel
}

async function checkNsfw(imgElement: HTMLImageElement): Promise<boolean> {
  const model = await getNsfwModel()
  const predictions = await model.classify(imgElement)
  const get = (name: string) => predictions.find(p => p.className === name)?.probability ?? 0
  const porn   = get('Porn')
  const hentai = get('Hentai')
  const sexy   = get('Sexy')
  return porn > 0.2 || hentai > 0.2 || sexy > 0.4 || (porn + hentai + sexy) > 0.5
}

function convertToPng(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'))
          return
        }
        const baseName = file.name.replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${baseName}.png`, { type: 'image/png' }))
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for conversion'))
    }
    img.src = objectUrl
  })
}

interface ImageUploaderProps {
  user: User | null
}

export default function ImageUploader({ user }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wasConverted, setWasConverted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (selected: File) => {
    if (!selected.type.startsWith('image/')) {
      setErrorMsg('Only image files are supported.')
      setUploadState('error')
      return
    }

    let finalFile = selected
    let converted = false

    if (selected.type !== 'image/png') {
      try {
        finalFile = await convertToPng(selected)
        converted = true
      } catch {
        setErrorMsg('Failed to convert image to PNG. Please try another file.')
        setUploadState('error')
        return
      }
    }

    const url = URL.createObjectURL(finalFile)
    setFile(finalFile)
    setPreviewUrl(url)
    setPublicUrl(null)
    setErrorMsg(null)
    setWasConverted(converted)
    setUploadState('scanning')

    // NSFW scan — load image element from the blob URL
    try {
      const img = new Image()
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error('Image load failed'))
        img.src = url
      })
      const flagged = await checkNsfw(img)
      if (flagged) {
        URL.revokeObjectURL(url)
        setFile(null)
        setPreviewUrl(null)
        setErrorMsg('This image contains nudity or explicit content and cannot be uploaded.')
        setUploadState('error')
        return
      }
    } catch {
      // If scan fails, allow upload (fail open)
    }

    setUploadState('preview')
  }, [])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (uploadState === 'uploading' || uploadState === 'done') return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const pasted = item.getAsFile()
          if (pasted) {
            const named = new File([pasted], `paste-${Date.now()}.${item.type.split('/')[1] || 'png'}`, { type: item.type })
            handleFile(named)
          }
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [uploadState, handleFile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleUpload = async () => {
    if (!file) return
    setUploadState('uploading')
    setErrorMsg(null)

    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const path = `img/${id}.png`

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      setErrorMsg(uploadError.message)
      setUploadState('error')
      return
    }

    // Track upload in DB (user_id null for anonymous)
    await supabase.from('uploads').insert({
      filename: `${id}.png`,
      user_id: user?.id ?? null,
    })

    setPublicUrl(`https://uzgrudinti.dev/img/${id}.png`)
    setUploadState('done')
  }

  const handleCopy = async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setPublicUrl(null)
    setErrorMsg(null)
    setUploadState('idle')
    setCopied(false)
    setWasConverted(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="uploader-root">
      <main className="uploader-main">
        <div className="uploader-card">
          <h2 className="uploader-title">Image Uploader</h2>
          <p className="uploader-desc">
            Upload an image to get a shareable link.
            {!user && <span className="uploader-desc-hint"> Log in to keep a history of your uploads.</span>}
          </p>

          {uploadState === 'idle' && (
            <div
              className={`drop-zone ${dragging ? 'drop-zone--active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="drop-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="drop-label">Drag & drop an image here</p>
              <p className="drop-sublabel">or <span className="drop-link">click to browse</span> · <kbd className="drop-kbd">Ctrl+V</kbd> to paste</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="drop-input"
                onChange={handleInputChange}
              />
            </div>
          )}

          {uploadState === 'scanning' && (
            <div className="scanning-state">
              <span className="spinner scanning-spinner" />
              <p className="scanning-label">Scanning for NSFW content…</p>
            </div>
          )}

          {(uploadState === 'preview' || uploadState === 'uploading') && previewUrl && (
            <div className="preview-section">
              <div className="preview-frame">
                <img src={previewUrl} alt="Preview" className="preview-img" />
              </div>
              <p className="preview-filename">{file?.name}</p>
              {wasConverted && (
                <div className="convert-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Converted to PNG
                </div>
              )}
              <div className="preview-actions">
                <button
                  className="btn-outline"
                  onClick={handleReset}
                  disabled={uploadState !== 'preview'}
                >
                  Change
                </button>
                <button
                  className="btn-primary"
                  onClick={handleUpload}
                  disabled={uploadState !== 'preview'}
                >
                  {uploadState === 'uploading' ? (
                    <span className="btn-spinner">
                      <span className="spinner" />
                      Uploading...
                    </span>
                  ) : (
                    'Upload Image'
                  )}
                </button>
              </div>
            </div>
          )}

          {uploadState === 'done' && previewUrl && (
            <div className="done-section">
              <div className="preview-frame">
                <img src={previewUrl} alt="Uploaded" className="preview-img" />
              </div>
              <div className="done-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Uploaded successfully
              </div>
              <div className="link-row">
                <input
                  type="text"
                  className="link-input"
                  value={publicUrl ?? ''}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className={`btn-copy ${copied ? 'btn-copy--copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <button className="btn-reset" onClick={handleReset}>
                Upload Another
              </button>
            </div>
          )}

          {uploadState === 'error' && (
            <div className="error-section">
              <div className="error-msg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMsg ?? 'An error occurred. Please try again.'}
              </div>
              <button className="btn-primary" onClick={handleReset}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
