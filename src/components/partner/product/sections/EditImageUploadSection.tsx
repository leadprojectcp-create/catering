import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import styles from './EditImageUploadSection.module.css'

interface EditImageUploadSectionProps {
  existingImages: string[]
  newImages: File[]
  onExistingImageRemove: (index: number) => void
  onExistingImagesReorder: (images: string[]) => void
  onNewImagesAdd: (files: File[]) => void
  onNewImageRemove: (index: number) => void
  onNewImagesReorder: (files: File[]) => void
}

// 통합 이미지 아이템 타입
type ImageItem =
  | { type: 'existing'; url: string; index: number }
  | { type: 'new'; file: File; index: number }

interface SortableImageItemProps {
  id: string
  item: ImageItem
  isFirst: boolean
  onRemove: () => void
}

function SortableImageItem({ id, item, isFirst, onRemove }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }

  const imageSrc = item.type === 'existing'
    ? item.url
    : URL.createObjectURL(item.file)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.imagePreviewBox} ${isFirst ? styles.mainImage : ''}`}
    >
      {/* 드래그 핸들 */}
      <button
        type="button"
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="3" cy="2" r="1.5" />
          <circle cx="9" cy="2" r="1.5" />
          <circle cx="3" cy="6" r="1.5" />
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="3" cy="10" r="1.5" />
          <circle cx="9" cy="10" r="1.5" />
        </svg>
      </button>

      <img
        src={imageSrc}
        alt={`상품 이미지`}
        className={styles.previewImage}
      />
      {isFirst && (
        <div className={styles.mainImageLabel}>대표</div>
      )}
      <button
        type="button"
        className={styles.removeImageBtn}
        onClick={onRemove}
      >
        ✕
      </button>
    </div>
  )
}

export default function EditImageUploadSection({
  existingImages,
  newImages,
  onExistingImageRemove,
  onExistingImagesReorder,
  onNewImagesAdd,
  onNewImageRemove,
  onNewImagesReorder
}: EditImageUploadSectionProps) {
  // 기존 이미지와 새 이미지를 통합 배열로 관리
  const allItems: ImageItem[] = [
    ...existingImages.map((url, index) => ({ type: 'existing' as const, url, index })),
    ...newImages.map((file, index) => ({ type: 'new' as const, file, index })),
  ]

  const getItemIds = () => allItems.map((item, i) =>
    item.type === 'existing' ? `existing-${item.index}` : `new-${item.index}`
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onNewImagesAdd(files)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // 현재 순서에서 인덱스 찾기
    const oldIndex = allItems.findIndex((item, i) => {
      const id = item.type === 'existing' ? `existing-${item.index}` : `new-${item.index}`
      return id === activeId
    })
    const newIndex = allItems.findIndex((item, i) => {
      const id = item.type === 'existing' ? `existing-${item.index}` : `new-${item.index}`
      return id === overId
    })

    if (oldIndex === -1 || newIndex === -1) return

    // 새로운 순서 계산
    const reorderedItems = arrayMove(allItems, oldIndex, newIndex)

    // 기존 이미지와 새 이미지로 분리
    const newExistingImages: string[] = []
    const newNewImages: File[] = []

    reorderedItems.forEach(item => {
      if (item.type === 'existing') {
        newExistingImages.push(item.url)
      } else {
        newNewImages.push(item.file)
      }
    })

    // 상위 컴포넌트에 변경 사항 전달
    onExistingImagesReorder(newExistingImages)
    onNewImagesReorder(newNewImages)
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>1</span>
        <span className={styles.sectionTitle}>상품 이미지 등록</span>
      </div>
      <p className={styles.dragHint}>드래그하여 순서를 변경할 수 있습니다. 첫 번째 이미지가 대표 이미지입니다.</p>
      <div className={styles.imageUploadSection}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={getItemIds()} strategy={rectSortingStrategy}>
            <div className={styles.imageGrid}>
              {/* 모든 이미지 (기존 + 새 이미지) 통합 렌더링 */}
              {allItems.map((item, globalIndex) => {
                const id = item.type === 'existing'
                  ? `existing-${item.index}`
                  : `new-${item.index}`

                return (
                  <SortableImageItem
                    key={id}
                    id={id}
                    item={item}
                    isFirst={globalIndex === 0}
                    onRemove={() => {
                      if (item.type === 'existing') {
                        onExistingImageRemove(item.index)
                      } else {
                        onNewImageRemove(item.index)
                      }
                    }}
                  />
                )
              })}

              {/* 이미지 추가 버튼 */}
              <label className={styles.addImageButton}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageAdd}
                  className={styles.fileInput}
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H12M12 12H19M12 12V5M12 12V19" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </label>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
