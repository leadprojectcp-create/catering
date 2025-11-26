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
import styles from './ImageUploadSection.module.css'

interface ImageUploadSectionProps {
  images: File[]
  onChange: (images: File[]) => void
}

interface SortableImageItemProps {
  id: string
  file: File
  index: number
  onRemove: (index: number) => void
}

function SortableImageItem({ id, file, index, onRemove }: SortableImageItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.imagePreviewBox} ${index === 0 ? styles.mainImage : ''}`}
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
        src={URL.createObjectURL(file)}
        alt={`상품 이미지 ${index + 1}`}
        className={styles.previewImage}
      />
      {index === 0 && (
        <div className={styles.mainImageLabel}>대표</div>
      )}
      <button
        type="button"
        className={styles.removeImageBtn}
        onClick={() => onRemove(index)}
      >
        ✕
      </button>
    </div>
  )
}

export default function ImageUploadSection({ images, onChange }: ImageUploadSectionProps) {
  const getImageIds = () => images.map((_, i) => `image-${i}`)

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
    onChange([...images, ...files])
  }

  const handleImageRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id).split('-')[1])
      const newIndex = parseInt(String(over.id).split('-')[1])

      onChange(arrayMove(images, oldIndex, newIndex))
    }
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
          <SortableContext items={getImageIds()} strategy={rectSortingStrategy}>
            <div className={styles.imageGrid}>
              {/* 이미지 미리보기 */}
              {images.map((file, index) => (
                <SortableImageItem
                  key={`image-${index}`}
                  id={`image-${index}`}
                  file={file}
                  index={index}
                  onRemove={handleImageRemove}
                />
              ))}

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
