import type { TranslationSchema } from './en';

// QA terms that are standard in English (Test Case, Bug Report, Quiz…) are
// kept in English on purpose: they are what learners will see at work.
export const vi: TranslationSchema = {
  app: {
    name: 'QA Learning Lab',
    admin: 'Quản trị',
  },
  nav: {
    mainLabel: 'Điều hướng chính',
    open: 'Mở menu',
    dashboard: 'Tổng quan',
    learning: 'Học tập',
    practice: 'Luyện tập',
    quiz: 'Quiz',
    testCase: 'Luyện viết Test Case',
    bugReport: 'Luyện viết Bug Report',
    scenario: 'Thử thách tình huống',
    progress: 'Tiến độ',
    profile: 'Hồ sơ',
    courses: 'Khóa học',
    backToApp: 'Quay lại ứng dụng',
    user: 'Người dùng',
  },
  pages: {
    dashboard: {
      title: 'Tổng quan',
      description: 'Tiến độ học tập của bạn trong nháy mắt.',
    },
    learning: {
      title: 'Học tập',
      description: 'Khóa học được nhóm theo kỹ năng.',
    },
    quiz: { title: 'Quiz', description: '' },
    testCase: { title: 'Luyện viết Test Case', description: '' },
    bugReport: { title: 'Luyện viết Bug Report', description: '' },
    scenario: { title: 'Thử thách tình huống', description: '' },
    progress: { title: 'Tiến độ', description: '' },
    profile: { title: 'Hồ sơ', description: '' },
    adminCourses: {
      title: 'Khóa học',
      description: 'Tạo và quản lý khóa học, module, bài học và bài tập.',
    },
    login: { title: 'Đăng nhập', description: '' },
  },
  placeholder: {
    comingInPhase: 'Sẽ có ở Phase {{phase}}',
  },
  apiStatus: {
    connecting: 'Đang kết nối…',
    online: 'API hoạt động',
    offline: 'Mất kết nối API',
  },
  feedback: {
    loading: 'Đang tải…',
    loadFailed: 'Không tải được dữ liệu',
    genericError: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    networkError: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    tryAgain: 'Thử lại',
  },
  errors: {
    notFoundTitle: 'Không tìm thấy trang',
    notFoundDescription: 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.',
    goToDashboard: 'Về trang tổng quan',
    crashTitle: 'Đã có lỗi xảy ra',
    crashDescription: 'Có lỗi không mong muốn. Tải lại trang để tiếp tục.',
    routeErrorDescription:
      'Không tải được trang này. Hãy thử lại hoặc quay về trang tổng quan.',
    reload: 'Tải lại',
  },
  preferences: {
    language: 'Ngôn ngữ',
    theme: 'Giao diện',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    themeSystem: 'Theo hệ thống',
  },
};
