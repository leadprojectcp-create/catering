'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
            페이지 로딩 중 오류가 발생했습니다
          </h1>
          <p style={{ fontSize: '16px', marginBottom: '20px', color: '#666' }}>
            {this.state.error?.message || '알 수 없는 오류'}
          </p>
          <details style={{ marginBottom: '20px', textAlign: 'left', maxWidth: '600px', width: '100%' }}>
            <summary style={{ cursor: 'pointer', padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
              상세 정보 보기
            </summary>
            <pre style={{
              padding: '20px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              {this.state.error?.stack}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined, errorInfo: undefined })
              window.location.reload()
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#025BD9',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            페이지 새로고침
          </button>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined, errorInfo: undefined })
              window.location.href = '/'
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            메인 페이지로 이동
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
