type ErrorOperation = 'fetch' | 'create' | 'update' | 'delete' | 'auth' | 'upload'

const GENERIC_MESSAGES: Record<ErrorOperation, string> = {
  fetch: 'Không thể tải dữ liệu. Vui lòng thử lại.',
  create: 'Không thể tạo. Vui lòng thử lại.',
  update: 'Không thể cập nhật. Vui lòng thử lại.',
  delete: 'Không thể xóa. Vui lòng thử lại.',
  auth: 'Đăng nhập thất bại. Kiểm tra email và mật khẩu.',
  upload: 'Không thể tải ảnh lên. Vui lòng thử lại.',
}

export function getErrorMessage(error: unknown, operation: ErrorOperation): string {
  const code = (error as { code?: string })?.code
  const message = ((error as { message?: string })?.message ?? '').toString().toLowerCase()

  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'Lỗi kết nối. Kiểm tra mạng và thử lại.'
  }

  return GENERIC_MESSAGES[operation]
}

export type { ErrorOperation }
