import React from 'react'
import styles from '../AddProductPage.module.css'

interface OriginItem {
  ingredient: string
  origin: string
}

interface OriginSectionProps {
  origin: OriginItem[]
  onChange: (origin: OriginItem[]) => void
}

export default function OriginSection({ origin, onChange }: OriginSectionProps) {
  const addCustomOrigin = () => {
    onChange([...origin, { ingredient: '', origin: '' }])
  }

  const updateCustomOrigin = (index: number, field: 'ingredient' | 'origin', value: string) => {
    onChange(origin.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const removeCustomOrigin = (index: number) => {
    onChange(origin.filter((_, i) => i !== index))
  }

  const displayOrigin = origin.length === 0 ? [{ ingredient: '', origin: '' }] : origin

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>10</span>
        <span className={styles.sectionTitle}>원산지 표기</span>
      </div>
      <div className={styles.originContainer}>
        {displayOrigin.map((item, index) => (
          <div key={index} className={styles.originRow}>
            <input
              type="text"
              placeholder="ex) 돼지고기"
              value={item.ingredient}
              onChange={(e) => {
                const value = e.target.value
                if (origin.length === 0) {
                  onChange([{ ingredient: value, origin: '' }])
                } else {
                  updateCustomOrigin(index, 'ingredient', value)
                }
              }}
              className={styles.textInput}
            />
            <div className={styles.originInputWrapper}>
              <input
                type="text"
                placeholder="ex) 국내산"
                value={item.origin}
                onChange={(e) => {
                  const value = e.target.value
                  if (origin.length === 0) {
                    onChange([{ ingredient: item.ingredient, origin: value }])
                  } else {
                    updateCustomOrigin(index, 'origin', value)
                  }
                }}
                className={styles.textInput}
                disabled={origin.length === 0 && !item.ingredient}
              />
              {origin.length === 0 ? (
                <button
                  type="button"
                  className={styles.addOriginButton}
                  disabled
                >
                  +
                </button>
              ) : index === origin.length - 1 ? (
                <button
                  type="button"
                  onClick={addCustomOrigin}
                  className={styles.addOriginButton}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeCustomOrigin(index)}
                  className={styles.removeOriginButton}
                >
                  −
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
