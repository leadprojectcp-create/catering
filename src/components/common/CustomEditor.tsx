'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './CustomEditor.module.css'

interface CustomEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  storeId?: string
  productId?: string
  uploadType?: string
}

export default function CustomEditor({ value, onChange, placeholder, storeId, productId, uploadType = 'product' }: CustomEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const isInitialMount = useRef(true)

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
    '#FF0000', '#FF6B00', '#FFB800', '#FFE600', '#B8FF00',
    '#00FF00', '#00FFB8', '#00E6FF', '#0088FF', '#0000FF',
    '#6B00FF', '#B800FF', '#FF00E6', '#FF0088', '#FF6B6B'
  ]

  const fontSizes = [
    { label: '12px', value: '12px' },
    { label: '14px', value: '14px' },
    { label: '16px', value: '16px' },
    { label: '18px', value: '18px' },
    { label: '20px', value: '20px' },
    { label: '24px', value: '24px' },
    { label: '28px', value: '28px' },
    { label: '32px', value: '32px' }
  ]

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', uploadType)
      if (storeId) formData.append('storeId', storeId)
      if (productId) formData.append('productId', productId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('이미지 업로드 실패')

      const result = await response.json()

      // Insert image directly into editor content
      if (editorRef.current) {
        const img = `<img src="${result.url}" alt="상품 이미지" style="max-width: 100%; height: auto;" />`

        // Focus the editor first
        editorRef.current.focus()

        // Try to use execCommand if selection exists, otherwise append to end
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          try {
            document.execCommand('insertHTML', false, img)
          } catch (error) {
            // Fallback: append to the end of content
            editorRef.current.innerHTML += img
          }
        } else {
          // No selection, append to end
          editorRef.current.innerHTML += img
        }

        handleInput()
      }
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFontSizeChange = (size: string) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      span.style.fontSize = size
      span.style.lineHeight = 'normal'
      span.style.display = 'inline'
      try {
        range.surroundContents(span)
      } catch {
        // If surroundContents fails, use a different approach
        const fragment = range.extractContents()
        span.appendChild(fragment)
        range.insertNode(span)
      }
      handleInput()
      editorRef.current?.focus()
    }
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    execCommand('foreColor', color)
    setShowColorPicker(false)
    handleInput()
  }

  // Only set initial value on mount
  useEffect(() => {
    if (isInitialMount.current && editorRef.current && value) {
      editorRef.current.innerHTML = value
      isInitialMount.current = false
    }
  }, [value])

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        {/* Text styling */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className={styles.toolButton}
            title="굵게"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className={styles.toolButton}
            title="이탤릭"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className={styles.toolButton}
            title="밑줄"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => execCommand('strikeThrough')}
            className={styles.toolButton}
            title="취소선"
          >
            <s>S</s>
          </button>
        </div>

        {/* Font size */}
        <div className={styles.toolGroup}>
          <select
            onChange={(e) => {
              const size = e.target.value
              if (size) {
                handleFontSizeChange(size)
                e.target.value = ''
              }
            }}
            className={styles.fontSizeSelect}
            defaultValue=""
          >
            <option value="" disabled>글자 크기</option>
            {fontSizes.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Color picker */}
        <div className={styles.toolGroup}>
          <div className={styles.colorPickerWrapper}>
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={styles.colorButton}
              title="글자 색상"
            >
              <span className={styles.colorIcon}>A</span>
              <span
                className={styles.colorBar}
                style={{ backgroundColor: selectedColor }}
              />
            </button>
            {showColorPicker && (
              <div className={styles.colorPicker}>
                <div className={styles.colorGrid}>
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={styles.colorOption}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alignment */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className={styles.toolButton}
            title="왼쪽 정렬"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className={styles.toolButton}
            title="가운데 정렬"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className={styles.toolButton}
            title="오른쪽 정렬"
          >
            ≡
          </button>
        </div>

        {/* Image upload */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.toolButton}
            title="이미지 삽입"
          >
            🖼
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div
        ref={editorRef}
        className={styles.editorContent}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  )
}
