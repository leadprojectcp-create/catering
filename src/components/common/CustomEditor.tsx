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
  const [currentFontSize, setCurrentFontSize] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
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

  // 선택 영역의 폰트 크기 감지
  const detectFontSize = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      let node: Node | null = range.startContainer

      // 텍스트 노드면 부모 요소로
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode
      }

      if (node && node instanceof HTMLElement) {
        const computedStyle = window.getComputedStyle(node)
        const fontSize = computedStyle.fontSize
        setCurrentFontSize(fontSize)
      }
    }
  }, [])

  // 선택 변경 감지
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current?.contains(document.activeElement) ||
          editorRef.current?.contains(window.getSelection()?.anchorNode || null)) {
        detectFontSize()
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [detectFontSize])

  // 파일 배열로 이미지 업로드 처리
  const uploadImages = useCallback(async (fileArray: File[]) => {
    if (fileArray.length === 0) return

    setIsUploading(true)

    try {
      // Focus the editor first
      if (editorRef.current) {
        editorRef.current.focus()
      }

      // Get the current selection position
      const selection = window.getSelection()
      const insertionPoint = editorRef.current

      // Upload files sequentially in the order they were selected
      for (const file of fileArray) {
        // 이미지 파일만 처리
        if (!file.type.startsWith('image/')) continue

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
        if (insertionPoint) {
          // Wrap image in a div without default alignment
          const imgWrapper = `<div><img src="${result.url}" alt="상품 이미지" style="max-width: 100%; height: auto; display: inline-block;" /></div>`

          // Try to use execCommand if selection exists, otherwise append to end
          if (selection && selection.rangeCount > 0) {
            try {
              document.execCommand('insertHTML', false, imgWrapper)
            } catch {
              // Fallback: append to the end of content
              insertionPoint.innerHTML += imgWrapper
            }
          } else {
            // No selection, append to end
            insertionPoint.innerHTML += imgWrapper
          }
        }
      }

      // Update the value after all images are inserted
      handleInput()
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }, [uploadType, storeId, productId, handleInput])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    await uploadImages(Array.from(files))

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 에디터 영역을 완전히 벗어났을 때만 드래그 상태 해제
    if (!editorRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    // 이미지 파일만 필터링
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    await uploadImages(imageFiles)
  }, [uploadImages])

  const handleFontSizeChange = (size: string) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed && editorRef.current) {
      const range = selection.getRangeAt(0)

      // 선택 영역의 텍스트만 추출
      const selectedText = range.toString()
      if (!selectedText) return

      // 선택 영역 삭제
      range.deleteContents()

      // 새 span 생성 (텍스트만 포함)
      const span = document.createElement('span')
      span.style.fontSize = size
      span.textContent = selectedText

      // 현재 위치에서 font-size가 있는 부모 span을 찾아서 그 밖으로 삽입
      let insertTarget: Node = range.startContainer
      let insertParent: Node | null = insertTarget.parentNode

      // font-size 스타일이 있는 span을 찾아 올라감
      while (insertParent && insertParent !== editorRef.current) {
        if (insertParent instanceof HTMLElement &&
            insertParent.tagName === 'SPAN' &&
            insertParent.style.fontSize) {
          insertTarget = insertParent
          insertParent = insertParent.parentNode
        } else {
          break
        }
      }

      // font-size span 밖으로 삽입
      if (insertTarget !== range.startContainer && insertParent) {
        insertParent.insertBefore(span, insertTarget.nextSibling)
      } else {
        range.insertNode(span)
      }

      // 빈 span 태그들 제거
      const cleanEmptySpans = () => {
        const allSpans = editorRef.current!.querySelectorAll('span')
        allSpans.forEach(s => {
          if (s !== span && !s.textContent?.trim() && !s.querySelector('img')) {
            s.remove()
          }
        })
      }
      cleanEmptySpans()

      // 선택 영역 복원
      selection.removeAllRanges()
      const newRange = document.createRange()
      newRange.selectNodeContents(span)
      selection.addRange(newRange)

      setCurrentFontSize(size)
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
    if (isInitialMount.current && editorRef.current) {
      if (value) {
        editorRef.current.innerHTML = value
      }
      isInitialMount.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              }
            }}
            className={styles.fontSizeSelect}
            value={currentFontSize || ''}
          >
            <option value="" disabled>글자 크기</option>
            {fontSizes.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
            {/* 현재 선택된 폰트가 목록에 없을 때 표시 */}
            {currentFontSize && !fontSizes.find(f => f.value === currentFontSize) && (
              <option value={currentFontSize}>{currentFontSize}</option>
            )}
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
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div
        ref={editorRef}
        className={`${styles.editorContent} ${isDragging ? styles.dragging : ''}`}
        contentEditable
        onInput={handleInput}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {isUploading && (
        <div className={styles.uploadingOverlay}>
          <div className={styles.spinner}></div>
          <p>이미지 업로드 중...</p>
        </div>
      )}
    </div>
  )
}
