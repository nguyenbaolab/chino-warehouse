import { Component, type ErrorInfo, type ReactNode } from 'react'
import ConfigErrorScreen from './ConfigErrorScreen'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

/** Bắt lỗi render/sync khi khởi động — tránh màn đen + "has stopped working" không có thông báo. */
export default class StartupErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Lỗi không xác định',
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[StartupErrorBoundary]', error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ConfigErrorScreen
          title="Ứng dụng gặp lỗi"
          message={this.state.message}
          hint="Thử cài lại bản APK mới nhất. Nếu vẫn lỗi, gửi ảnh màn hình này cho quản trị."
        />
      )
    }
    return this.props.children
  }
}
