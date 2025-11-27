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
  const [selectedQuoteBlock, setSelectedQuoteBlock] = useState<HTMLElement | null>(null)
  const [selectedDividerBlock, setSelectedDividerBlock] = useState<HTMLElement | null>(null)
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const draggedImageRef = useRef<HTMLImageElement | null>(null)
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
          // Wrap image in a div without default alignment (draggable for layout)
          const imgWrapper = `<div style="margin: 10px 0;"><img src="${result.url}" alt="상품 이미지" style="max-width: 100%; height: auto; display: inline-block; border-radius: 4px; cursor: move;" draggable="true" /></div>`

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

  // 드래그 앤 드롭 핸들러 (외부 파일 드래그용)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 내부 이미지 드래그 중이면 파일 드래그 상태 활성화하지 않음
    if (draggedImageRef.current) return
    // 외부에서 파일을 드래그해 올 때만 활성화
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 내부 이미지 드래그 중이면 무시
    if (draggedImageRef.current) return
    // 에디터 영역을 완전히 벗어났을 때만 드래그 상태 해제
    if (!editorRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 내부 이미지 드래그 중이면 파일 드래그 상태 활성화하지 않음
    if (draggedImageRef.current) return
    // 외부에서 파일을 드래그해 올 때만 활성화
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // 내부 이미지 드래그 중이면 여기서 처리하지 않음 (useEffect의 handleDrop에서 처리)
    if (draggedImageRef.current) return

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

  // 이미지를 그리드 컨테이너에 추가하는 함수
  const addImageToGrid = useCallback((sourceImg: HTMLImageElement, targetImg: HTMLImageElement, position: 'left' | 'right' | 'top' | 'bottom') => {
    const sourceWrapper = sourceImg.closest('div')
    const targetWrapper = targetImg.closest('[data-image-grid]') || targetImg.closest('div')

    if (!sourceWrapper || !targetWrapper) return

    // 타겟이 이미 그리드인 경우
    const existingGrid = targetImg.closest('[data-image-grid]') as HTMLElement | null

    if (existingGrid) {
      // 기존 그리드에 이미지 추가
      const gridDirection = existingGrid.getAttribute('data-grid-direction')
      const newImgWrapper = document.createElement('div')
      newImgWrapper.style.cssText = 'flex: 1; min-width: 0;'
      newImgWrapper.innerHTML = `<img src="${sourceImg.src}" alt="상품 이미지" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: move;" draggable="true" />`

      if (gridDirection === 'row' && (position === 'left' || position === 'right')) {
        // 가로 그리드에 가로로 추가
        if (position === 'left') {
          const targetImgWrapper = targetImg.closest('div')
          if (targetImgWrapper) existingGrid.insertBefore(newImgWrapper, targetImgWrapper)
        } else {
          const targetImgWrapper = targetImg.closest('div')
          if (targetImgWrapper) existingGrid.insertBefore(newImgWrapper, targetImgWrapper.nextSibling)
        }
      } else if (gridDirection === 'column' && (position === 'top' || position === 'bottom')) {
        // 세로 그리드에 세로로 추가
        if (position === 'top') {
          const targetImgWrapper = targetImg.closest('div')
          if (targetImgWrapper) existingGrid.insertBefore(newImgWrapper, targetImgWrapper)
        } else {
          const targetImgWrapper = targetImg.closest('div')
          if (targetImgWrapper) existingGrid.insertBefore(newImgWrapper, targetImgWrapper.nextSibling)
        }
      } else {
        // 방향이 다른 경우 새 그리드로 감싸기
        const targetImgWrapper = targetImg.closest('div') as HTMLElement
        if (!targetImgWrapper) return

        const newDirection = (position === 'left' || position === 'right') ? 'row' : 'column'
        const newGrid = document.createElement('div')
        newGrid.setAttribute('data-image-grid', 'true')
        newGrid.setAttribute('data-grid-direction', newDirection)
        newGrid.style.cssText = `display: flex; flex-direction: ${newDirection}; gap: 8px; margin: 10px 0;`

        const clonedTarget = targetImgWrapper.cloneNode(true) as HTMLElement

        if (position === 'left' || position === 'top') {
          newGrid.appendChild(newImgWrapper)
          newGrid.appendChild(clonedTarget)
        } else {
          newGrid.appendChild(clonedTarget)
          newGrid.appendChild(newImgWrapper)
        }

        targetImgWrapper.replaceWith(newGrid)
      }
    } else {
      // 새 그리드 생성
      const direction = (position === 'left' || position === 'right') ? 'row' : 'column'
      const grid = document.createElement('div')
      grid.setAttribute('data-image-grid', 'true')
      grid.setAttribute('data-grid-direction', direction)
      grid.style.cssText = `display: flex; flex-direction: ${direction}; gap: 8px; margin: 10px 0;`

      const sourceImgWrapper = document.createElement('div')
      sourceImgWrapper.style.cssText = 'flex: 1; min-width: 0;'
      sourceImgWrapper.innerHTML = `<img src="${sourceImg.src}" alt="상품 이미지" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: move;" draggable="true" />`

      const targetImgWrapper = document.createElement('div')
      targetImgWrapper.style.cssText = 'flex: 1; min-width: 0;'
      targetImgWrapper.innerHTML = `<img src="${targetImg.src}" alt="상품 이미지" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: move;" draggable="true" />`

      if (position === 'left' || position === 'top') {
        grid.appendChild(sourceImgWrapper)
        grid.appendChild(targetImgWrapper)
      } else {
        grid.appendChild(targetImgWrapper)
        grid.appendChild(sourceImgWrapper)
      }

      targetWrapper.replaceWith(grid)
    }

    // 소스 이미지 원본 제거
    sourceWrapper.remove()

    handleInput()
  }, [handleInput])

  // 인용구/구분선 블록 클릭 핸들러
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement

    // 이미지 클릭 처리
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement
      // 이전 선택 해제
      editorRef.current?.querySelectorAll('img.selected').forEach(el => el.classList.remove('selected'))
      img.classList.add('selected')
      setSelectedImage(img)
      setSelectedQuoteBlock(null)
      setSelectedDividerBlock(null)
      return
    }

    // 인용구 블록 찾기
    const quoteBlock = target.closest('[data-quote-block]') as HTMLElement | null
    // 구분선 블록 찾기
    const dividerBlock = target.closest('[data-divider-block]') as HTMLElement | null

    // 이전 인용구 선택 해제
    if (selectedQuoteBlock && selectedQuoteBlock !== quoteBlock) {
      selectedQuoteBlock.classList.remove('selected')
    }
    // 이전 구분선 선택 해제
    if (selectedDividerBlock && selectedDividerBlock !== dividerBlock) {
      selectedDividerBlock.classList.remove('selected')
    }
    // 이전 이미지 선택 해제
    editorRef.current?.querySelectorAll('img.selected').forEach(el => el.classList.remove('selected'))
    setSelectedImage(null)

    if (quoteBlock) {
      // 구분선 선택 해제
      setSelectedDividerBlock(null)
      // contenteditable 영역 클릭이 아닌 경우에만 블록 선택
      const editableArea = target.closest('[contenteditable="true"]')
      if (!editableArea || editableArea === editorRef.current) {
        e.preventDefault()
        quoteBlock.classList.add('selected')
        setSelectedQuoteBlock(quoteBlock)
        // 에디터에 포커스 유지
        editorRef.current?.focus()
      } else {
        // 편집 영역 클릭 시 선택 해제
        quoteBlock.classList.remove('selected')
        setSelectedQuoteBlock(null)
      }
    } else if (dividerBlock) {
      // 인용구 선택 해제
      setSelectedQuoteBlock(null)
      e.preventDefault()
      dividerBlock.classList.add('selected')
      setSelectedDividerBlock(dividerBlock)
      editorRef.current?.focus()
    } else {
      setSelectedQuoteBlock(null)
      setSelectedDividerBlock(null)
    }
  }, [selectedQuoteBlock, selectedDividerBlock])

  // 키보드 이벤트 핸들러 (Delete/Backspace로 인용구/구분선/이미지 삭제)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((selectedQuoteBlock || selectedDividerBlock || selectedImage) && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      if (selectedQuoteBlock) {
        selectedQuoteBlock.remove()
        setSelectedQuoteBlock(null)
      }
      if (selectedDividerBlock) {
        selectedDividerBlock.remove()
        setSelectedDividerBlock(null)
      }
      if (selectedImage) {
        // 이미지가 그리드 안에 있는지 확인
        const imageGrid = selectedImage.closest('[data-image-grid]') as HTMLElement | null
        const imageWrapper = selectedImage.closest('div')

        if (imageGrid && imageWrapper) {
          // 그리드 안의 이미지인 경우
          const remainingImages = imageGrid.querySelectorAll('img')
          if (remainingImages.length <= 2) {
            // 2개 이하면 그리드 해제하고 남은 이미지만 유지
            const otherImages = Array.from(remainingImages).filter(img => img !== selectedImage)
            if (otherImages.length === 1) {
              // 1개 남으면 그리드 해제
              const newWrapper = document.createElement('div')
              newWrapper.style.cssText = 'margin: 10px 0;'
              newWrapper.innerHTML = `<img src="${otherImages[0].src}" alt="상품 이미지" style="max-width: 100%; height: auto; display: inline-block; border-radius: 4px; cursor: move;" draggable="true" />`
              imageGrid.replaceWith(newWrapper)
            } else {
              // 0개 남으면 그리드 전체 삭제
              imageGrid.remove()
            }
          } else {
            // 3개 이상이면 해당 이미지 wrapper만 삭제
            imageWrapper.remove()
          }
        } else if (imageWrapper) {
          // 일반 이미지인 경우 wrapper 전체 삭제
          imageWrapper.remove()
        }
        setSelectedImage(null)
      }
      handleInput()
    }
  }, [selectedQuoteBlock, selectedDividerBlock, selectedImage, handleInput])

  // 이미지 드래그 이벤트 위임 처리
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    let currentDraggedImage: HTMLImageElement | null = null

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        currentDraggedImage = target as HTMLImageElement
        draggedImageRef.current = currentDraggedImage
        e.dataTransfer!.effectAllowed = 'move'
        e.dataTransfer!.setData('text/plain', currentDraggedImage.src)
        currentDraggedImage.style.opacity = '0.5'
      }
    }

    const handleDragEnd = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        (target as HTMLImageElement).style.opacity = '1'
      }
      currentDraggedImage = null
      draggedImageRef.current = null
      editor.querySelectorAll('.drop-indicator').forEach(el => el.remove())
    }

    const handleDragOver = (e: DragEvent) => {
      if (!currentDraggedImage) return

      const target = e.target as HTMLElement
      if (target.tagName !== 'IMG' || target === currentDraggedImage) return

      e.preventDefault()
      e.stopPropagation()

      const targetImg = target as HTMLImageElement
      const rect = targetImg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const width = rect.width
      const height = rect.height

      let position: 'left' | 'right' | 'top' | 'bottom' | null = null

      if (x < width * 0.3) {
        position = 'left'
      } else if (x > width * 0.7) {
        position = 'right'
      } else if (y < height * 0.3) {
        position = 'top'
      } else if (y > height * 0.7) {
        position = 'bottom'
      }

      if (position) {
        const wrapper = targetImg.closest('div')
        if (wrapper) {
          wrapper.querySelectorAll('.drop-indicator').forEach(el => el.remove())

          const indicator = document.createElement('div')
          indicator.className = 'drop-indicator'
          indicator.style.cssText = `
            position: absolute;
            background: #2196F3;
            pointer-events: none;
            z-index: 100;
            ${position === 'left' ? 'left: 0; top: 0; width: 4px; height: 100%;' : ''}
            ${position === 'right' ? 'right: 0; top: 0; width: 4px; height: 100%;' : ''}
            ${position === 'top' ? 'left: 0; top: 0; width: 100%; height: 4px;' : ''}
            ${position === 'bottom' ? 'left: 0; bottom: 0; width: 100%; height: 4px;' : ''}
          `
          wrapper.style.position = 'relative'
          wrapper.appendChild(indicator)
        }
      }
    }

    const handleDrop = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== 'IMG' || !currentDraggedImage) return

      e.preventDefault()
      e.stopPropagation()

      const targetImg = target as HTMLImageElement

      if (targetImg === currentDraggedImage) {
        currentDraggedImage = null
        draggedImageRef.current = null
        return
      }

      // 드롭 위치 다시 계산
      const rect = targetImg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const width = rect.width
      const height = rect.height

      let position: 'left' | 'right' | 'top' | 'bottom' | null = null

      if (x < width * 0.3) {
        position = 'left'
      } else if (x > width * 0.7) {
        position = 'right'
      } else if (y < height * 0.3) {
        position = 'top'
      } else if (y > height * 0.7) {
        position = 'bottom'
      }

      if (position && currentDraggedImage) {
        addImageToGrid(currentDraggedImage, targetImg, position)
      }

      currentDraggedImage = null
      draggedImageRef.current = null
      editor.querySelectorAll('.drop-indicator').forEach(el => el.remove())
    }

    editor.addEventListener('dragstart', handleDragStart)
    editor.addEventListener('dragend', handleDragEnd)
    editor.addEventListener('dragover', handleDragOver)
    editor.addEventListener('drop', handleDrop)

    return () => {
      editor.removeEventListener('dragstart', handleDragStart)
      editor.removeEventListener('dragend', handleDragEnd)
      editor.removeEventListener('dragover', handleDragOver)
      editor.removeEventListener('drop', handleDrop)
    }
  }, [addImageToGrid])

  // 외부 클릭 시 드롭다운 닫기 및 인용구 선택 해제
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // 인용구 드롭다운 외부 클릭 시 닫기
      const quoteDropdown = document.getElementById('quoteDropdown')
      const quoteButton = target.closest('[title="인용구"]')
      if (quoteDropdown && quoteDropdown.style.display !== 'none' && !quoteDropdown.contains(target) && !quoteButton) {
        quoteDropdown.style.display = 'none'
      }

      // 구분선 드롭다운 외부 클릭 시 닫기
      const dividerDropdown = document.getElementById('dividerDropdown')
      const dividerButton = target.closest('[title="구분선"]')
      if (dividerDropdown && dividerDropdown.style.display !== 'none' && !dividerDropdown.contains(target) && !dividerButton) {
        dividerDropdown.style.display = 'none'
      }

      // 에디터 외부 클릭 시 인용구/구분선/이미지 선택 해제
      if (editorRef.current && !editorRef.current.contains(target)) {
        if (selectedQuoteBlock) {
          selectedQuoteBlock.classList.remove('selected')
          setSelectedQuoteBlock(null)
        }
        if (selectedDividerBlock) {
          selectedDividerBlock.classList.remove('selected')
          setSelectedDividerBlock(null)
        }
        editorRef.current.querySelectorAll('img.selected').forEach(el => el.classList.remove('selected'))
        setSelectedImage(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [selectedQuoteBlock, selectedDividerBlock])

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
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

          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className={styles.toolButton}
            title="왼쪽 정렬"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className={styles.toolButton}
            title="가운데 정렬"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className={styles.toolButton}
            title="오른쪽 정렬"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2zm-6 4h18v2H3v-2z"/>
            </svg>
          </button>

          <div className={styles.dropdownWrapper}>
            <button
              type="button"
              className={styles.toolButton}
              title="인용구"
              onClick={() => {
                const dropdown = document.getElementById('quoteDropdown')
                if (dropdown) {
                  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'
                }
                // 구분선 드롭다운 닫기
                const dividerDropdown = document.getElementById('dividerDropdown')
                if (dividerDropdown) dividerDropdown.style.display = 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
              </svg>
            </button>
            <div id="quoteDropdown" className={styles.quoteDropdown} style={{ display: 'none' }}>
              {/* 따옴표 (위아래) */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, `
                    <div data-quote-block="true" contenteditable="false" style="text-align: center; margin: 20px 0; cursor: pointer; user-select: all; border: 2px solid transparent; border-radius: 8px; padding: 10px;">
                      <div style="font-size: 40px; color: #ddd; line-height: 1; font-family: Georgia, serif;">❝</div>
                      <div contenteditable="true" style="padding: 10px 20px; color: #666; font-size: 16px; outline: none;">내용을 입력하세요.</div>
                      <div style="font-size: 40px; color: #ddd; line-height: 1; font-family: Georgia, serif;">❞</div>
                    </div><p><br/></p>
                  `)
                  handleInput()
                  document.getElementById('quoteDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ textAlign: 'center', padding: '4px' }}>
                  <div style={{ fontSize: '18px', color: '#ddd', lineHeight: '1' }}>❝</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>따옴표</div>
                  <div style={{ fontSize: '18px', color: '#ddd', lineHeight: '1' }}>❞</div>
                </div>
              </button>

              {/* 버티컬 라인 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, `
                    <div data-quote-block="true" contenteditable="false" style="border-left: 3px solid #333; padding-left: 15px; margin: 15px 0; cursor: pointer; user-select: all;">
                      <div contenteditable="true" style="color: #666; font-size: 16px; outline: none;">내용을 입력하세요.</div>
                    </div><p><br/></p>
                  `)
                  handleInput()
                  document.getElementById('quoteDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '3px', height: '20px', background: '#333' }}></div>
                  <span style={{ fontSize: '11px', color: '#999' }}>버티컬 라인</span>
                </div>
              </button>

              {/* 말풍선 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, `
                    <div data-quote-block="true" contenteditable="false" style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0; margin-bottom: 25px; text-align: center; position: relative; background: #fff; cursor: pointer; user-select: all;">
                      <div contenteditable="true" style="color: #666; font-size: 16px; outline: none;">내용을 입력하세요.</div>
                      <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #ddd;"></div>
                      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 9px solid #fff;"></div>
                    </div><p><br/></p>
                  `)
                  handleInput()
                  document.getElementById('quoteDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '4px 12px', fontSize: '11px', color: '#999', position: 'relative' }}>
                  말풍선
                  <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #ddd' }}></div>
                </div>
              </button>

              {/* 따옴표 + 밑줄 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, `
                    <div data-quote-block="true" contenteditable="false" style="margin: 20px 0; cursor: pointer; user-select: all;">
                      <div style="font-size: 32px; color: #ddd; line-height: 1; font-family: Georgia, serif;">❝</div>
                      <div contenteditable="true" style="color: #666; font-size: 16px; padding: 10px 0; outline: none;">내용을 입력하세요.</div>
                      <div style="border-bottom: 1px solid #ddd; margin-top: 10px;"></div>
                    </div><p><br/></p>
                  `)
                  handleInput()
                  document.getElementById('quoteDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ textAlign: 'left', padding: '4px' }}>
                  <div style={{ fontSize: '14px', color: '#ddd', lineHeight: '1' }}>❝</div>
                  <div style={{ fontSize: '10px', color: '#999', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>따옴표+밑줄</div>
                </div>
              </button>

              {/* 테두리 박스 (말풍선 꼬리 오른쪽) */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, `
                    <div data-quote-block="true" contenteditable="false" style="border: 1px solid #ddd; padding: 20px; margin: 15px 0; margin-bottom: 25px; text-align: center; position: relative; background: #fff; cursor: pointer; user-select: all;">
                      <div contenteditable="true" style="color: #666; font-size: 16px; outline: none;">내용을 입력하세요.</div>
                      <div style="position: absolute; bottom: -10px; right: 20px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #ddd;"></div>
                      <div style="position: absolute; bottom: -8px; right: 21px; width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 9px solid #fff;"></div>
                    </div><p><br/></p>
                  `)
                  handleInput()
                  document.getElementById('quoteDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ border: '1px solid #ddd', padding: '4px 12px', fontSize: '11px', color: '#999', position: 'relative' }}>
                  테두리박스
                  <div style={{ position: 'absolute', bottom: '-6px', right: '8px', width: '0', height: '0', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #ddd' }}></div>
                </div>
              </button>

              {/* 프레임 (모서리 꺾임) */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, `
                    <div data-quote-block="true" contenteditable="false" style="margin: 20px 0; position: relative; padding: 30px 20px; text-align: center; cursor: pointer; user-select: all;">
                      <div style="position: absolute; top: 0; left: 0; width: 20px; height: 20px; border-top: 2px solid #999; border-left: 2px solid #999;"></div>
                      <div style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; border-bottom: 2px solid #999; border-right: 2px solid #999;"></div>
                      <div contenteditable="true" style="color: #666; font-size: 16px; outline: none;">내용을 입력하세요.</div>
                      <div contenteditable="true" style="color: #bbb; font-size: 12px; margin-top: 8px; outline: none;">출처 입력</div>
                    </div><p><br/></p>
                  `)
                  handleInput()
                  document.getElementById('quoteDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ position: 'relative', padding: '8px 16px', fontSize: '11px', color: '#999' }}>
                  <div style={{ position: 'absolute', top: '2px', left: '2px', width: '8px', height: '8px', borderTop: '1px solid #999', borderLeft: '1px solid #999' }}></div>
                  <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '8px', height: '8px', borderBottom: '1px solid #999', borderRight: '1px solid #999' }}></div>
                  프레임
                </div>
              </button>
            </div>
          </div>

          <div className={styles.dropdownWrapper}>
            <button
              type="button"
              className={styles.toolButton}
              title="구분선"
              onClick={() => {
                const dropdown = document.getElementById('dividerDropdown')
                if (dropdown) {
                  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'
                }
                // 인용구 드롭다운 닫기
                const quoteDropdown = document.getElementById('quoteDropdown')
                if (quoteDropdown) quoteDropdown.style.display = 'none'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 11h18v2H3z"/>
              </svg>
            </button>
            <div id="dividerDropdown" className={styles.quoteDropdown} style={{ display: 'none' }}>
              {/* 기본 실선 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="margin: 20px 0; cursor: pointer; user-select: all;"><hr style="border: none; border-top: 1px solid #ddd; margin: 0;" /></div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ width: '100px', height: '1px', background: '#ddd' }}></div>
              </button>

              {/* 굵은 실선 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="margin: 20px 0; cursor: pointer; user-select: all;"><hr style="border: none; border-top: 2px solid #999; margin: 0;" /></div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ width: '100px', height: '2px', background: '#999' }}></div>
              </button>

              {/* 중앙 굵은 짧은 선 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="text-align: center; margin: 20px 0; cursor: pointer; user-select: all;"><div style="display: inline-block; width: 50px; height: 3px; background: #333;"></div></div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ width: '40px', height: '3px', background: '#333' }}></div>
              </button>

              {/* 이중선 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="margin: 20px 0; cursor: pointer; user-select: all;"><div style="border-top: 1px solid #ddd; margin-bottom: 3px;"></div><div style="border-top: 1px solid #ddd;"></div></div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100px' }}>
                  <div style={{ height: '1px', background: '#ddd' }}></div>
                  <div style={{ height: '1px', background: '#ddd' }}></div>
                </div>
              </button>

              {/* 아래 화살표 (양쪽 선) */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="display: flex; align-items: center; margin: 20px 0; cursor: pointer; user-select: all;"><div style="flex: 1; height: 1px; background: #ddd;"></div><span style="color: #ccc; font-size: 20px; line-height: 1;">∨</span><div style="flex: 1; height: 1px; background: #ddd;"></div></div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
                  <span style={{ color: '#ccc', fontSize: '14px', lineHeight: 1 }}>∨</span>
                  <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
                </div>
              </button>

              {/* 다이아몬드 (양쪽 선) */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="display: flex; align-items: center; margin: 20px 0; cursor: pointer; user-select: all;"><div style="flex: 1; height: 1px; background: #ddd;"></div><span style="color: #ccc; font-size: 16px; line-height: 1;">◇</span><div style="flex: 1; height: 1px; background: #ddd;"></div></div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
                  <span style={{ color: '#ccc', fontSize: '12px', lineHeight: 1 }}>◇</span>
                  <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
                </div>
              </button>

              {/* 점 6개 */}
              <button
                type="button"
                className={styles.quoteOption}
                onClick={() => {
                  document.execCommand('insertHTML', false, '<div data-divider-block="true" style="text-align: center; margin: 20px 0; color: #bbb; font-size: 14px; letter-spacing: 4px; cursor: pointer; user-select: all;">······</div><p><br/></p>')
                  handleInput()
                  document.getElementById('dividerDropdown')!.style.display = 'none'
                }}
              >
                <div style={{ fontSize: '12px', color: '#bbb', letterSpacing: '3px' }}>······</div>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`${styles.toolButton} ${styles.imageButton}`}
            title="이미지 삽입"
          >
            사진
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

      <div
        ref={editorRef}
        className={`${styles.editorContent} ${isDragging ? styles.dragging : ''}`}
        contentEditable
        onInput={handleInput}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
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
