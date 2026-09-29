import type { TranslationSchema } from './en';

// QA terms that are standard in English (Test Case, Bug Report, Quiz,
// Severity, Priority…) are kept in English on purpose: they are what
// learners will see at work.
export const vi: TranslationSchema = {
  app: {
    name: 'QA Learning Lab',
    admin: 'Quản trị',
  },
  nav: {
    mainLabel: 'Điều hướng chính',
    practiceLabel: 'Các dạng luyện tập',
    open: 'Mở menu',
    close: 'Đóng menu',
    dashboard: 'Tổng quan',
    learning: 'Học tập',
    practice: 'Luyện tập',
    quiz: 'Quiz',
    testCase: 'Test Case',
    bugReport: 'Bug Report',
    scenario: 'Tình huống',
    progress: 'Tiến độ',
    profile: 'Hồ sơ',
    admin: 'Quản trị',
    courses: 'Khóa học',
    backToApp: 'Quay lại ứng dụng',
  },
  userMenu: {
    label: 'Menu tài khoản',
    profile: 'Hồ sơ',
    admin: 'Quản trị',
    signOut: 'Đăng xuất',
  },
  pages: {
    dashboard: {
      title: 'Tổng quan',
      description: 'Xem phần đã xong, phần chưa đạt và nên học gì tiếp.',
    },
    learning: {
      title: 'Học tập',
      description: 'Học lần lượt từng bài trong các khóa, nhóm theo kỹ năng.',
    },
    quiz: {
      title: 'Quiz',
      description: 'Kiểm tra mức hiểu bài bằng các quiz ngắn.',
    },
    testCase: {
      title: 'Luyện viết Test Case',
      description:
        'Luyện viết test case: precondition, các bước, test data và expected result.',
    },
    bugReport: {
      title: 'Luyện viết Bug Report',
      description:
        'Luyện viết bug report, đánh giá Severity và Priority riêng biệt.',
    },
    scenario: {
      title: 'Thử thách tình huống',
      description: 'Suy luận qua các tình huống kiểm thử thực tế.',
    },
    progress: {
      title: 'Tiến độ',
      description: 'Bài học và bài tập theo từng khóa, kèm kết quả.',
    },
    adminCourses: {
      title: 'Khóa học',
      description: 'Tạo và quản lý khóa học, module, bài học và bài tập.',
    },
  },
  placeholder: {
    opensInPhase: 'Mở ở Phase {{phase}}.',
  },
  verdict: {
    pass: 'Passed',
    fail: 'Failed',
    blocked: 'Blocked',
    notRun: 'Not run',
  },
  apiStatus: {
    connecting: 'Đang kết nối API…',
    online: 'API hoạt động',
    offline: 'Mất kết nối API',
  },
  feedback: {
    loading: 'Đang tải…',
    loadFailed: 'Không tải được dữ liệu',
    genericError: 'Đã có lỗi xảy ra. Hãy thử lại.',
    networkError: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    tooManyRequests: 'Thử quá nhiều lần. Đợi một phút rồi thử lại.',
    tryAgain: 'Thử lại',
  },
  errors: {
    expected: 'Expected',
    actual: 'Actual',
    notFoundTitle: 'Không tìm thấy trang',
    notFoundExpected: 'một trang tại {{path}}',
    notFoundActual: 'không có gì ở đây',
    noAccessTitle: 'Không có quyền truy cập',
    noAccessExpected: 'quyền admin để vào {{path}}',
    noAccessActual: 'tài khoản này là learner',
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
  auth: {
    fields: {
      email: 'Email',
      password: 'Mật khẩu',
      displayName: 'Tên hiển thị',
      newPassword: 'Mật khẩu mới',
      confirmPassword: 'Nhập lại mật khẩu mới',
      currentPassword: 'Mật khẩu hiện tại',
    },
    validation: {
      emailRequired: 'Nhập email của bạn.',
      emailInvalid: 'Nhập một địa chỉ email hợp lệ.',
      passwordRequired: 'Nhập mật khẩu.',
      passwordMin: 'Dùng ít nhất {{min}} ký tự.',
      passwordMax: 'Dùng tối đa {{max}} ký tự.',
      passwordMismatch: 'Hai mật khẩu không khớp.',
      displayNameRequired: 'Nhập tên hiển thị.',
      displayNameMax: 'Dùng tối đa {{max}} ký tự.',
    },
    passwordHint: 'Ít nhất {{min}} ký tự.',
    backToLogin: 'Quay lại đăng nhập',
    login: {
      title: 'Đăng nhập',
      submit: 'Đăng nhập',
      forgot: 'Quên mật khẩu?',
      noAccount: 'Chưa có tài khoản?',
      register: 'Tạo tài khoản',
      invalidCredentials: 'Email hoặc mật khẩu không đúng.',
      notVerified:
        'Hãy xác minh email trước khi đăng nhập. Đường link nằm trong email chúng tôi gửi lúc bạn đăng ký.',
      resend: 'Gửi lại link xác minh',
      resent:
        'Nếu tài khoản này chưa được xác minh, link mới đang được gửi tới.',
      sessionExpired: 'Phiên đăng nhập đã kết thúc. Đăng nhập lại để tiếp tục.',
    },
    register: {
      title: 'Tạo tài khoản',
      description: 'Bài học, lượt làm bài và tiến độ của bạn được lưu vào đây.',
      submit: 'Tạo tài khoản',
      haveAccount: 'Đã có tài khoản?',
      signIn: 'Đăng nhập',
      sentTitle: 'Kiểm tra email',
      sentBody:
        'Chúng tôi đã gửi link xác minh tới <strong>{{email}}</strong>. Mở link để hoàn tất tạo tài khoản. Link hết hạn sau 1 giờ.',
      resend: 'Gửi lại link',
      resent:
        'Nếu tài khoản này chưa được xác minh, link mới đang được gửi tới.',
    },
    verify: {
      title: 'Xác minh email',
      verifying: 'Đang kiểm tra link xác minh…',
      success: 'Đã xác minh email. Chào mừng bạn đến với QA Learning Lab.',
      failedTitle: 'Link này không dùng được',
      failed:
        'Link xác minh không hợp lệ, đã được dùng hoặc đã hết hạn. Nhập email để nhận link mới.',
      missing:
        'Hãy mở trang này từ link trong email xác minh, hoặc yêu cầu link mới bên dưới.',
      submit: 'Gửi link mới',
      sent: 'Nếu tài khoản này chưa được xác minh, link mới đang được gửi tới.',
    },
    forgot: {
      title: 'Đặt lại mật khẩu',
      description:
        'Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi link để chọn mật khẩu mới.',
      submit: 'Gửi link đặt lại',
      sentTitle: 'Kiểm tra email',
      sentBody:
        'Nếu có tài khoản dùng <strong>{{email}}</strong>, link đặt lại mật khẩu đang được gửi tới. Link hết hạn sau 1 giờ.',
    },
    reset: {
      title: 'Chọn mật khẩu mới',
      submit: 'Đặt mật khẩu mới',
      successTitle: 'Đã đổi mật khẩu',
      successBody:
        'Đăng nhập bằng mật khẩu mới. Mọi thiết bị đang đăng nhập đều đã bị đăng xuất.',
      signIn: 'Đăng nhập',
      invalidTitle: 'Link này không dùng được',
      invalid:
        'Link đặt lại mật khẩu không hợp lệ, đã được dùng hoặc đã hết hạn. Hãy yêu cầu link mới.',
      missing: 'Hãy mở trang này từ link trong email đặt lại mật khẩu.',
      requestNew: 'Yêu cầu link mới',
    },
  },
  profile: {
    title: 'Hồ sơ',
    description: 'Tài khoản của bạn, và điều bạn muốn đạt được khi học.',
    account: 'Tài khoản',
    email: 'Email',
    role: 'Vai trò',
    memberSince: 'Tham gia từ',
    roles: {
      learner: 'Learner',
      admin: 'Admin',
    },
    about: 'Về bạn',
    displayName: 'Tên hiển thị',
    experienceLevel: 'Mức kinh nghiệm',
    experienceLevelPlaceholder: 'Chưa chọn',
    levels: {
      beginner: 'Mới bắt đầu',
      some_qa: 'Đã có chút kinh nghiệm QA',
      working_qa: 'Đang làm QA/QC',
      automation_qa: 'Automation QA',
    },
    learningGoals: 'Mục tiêu học tập',
    learningGoalsHint:
      'Gõ một mục tiêu rồi nhấn Enter. Tối đa {{max}} mục tiêu, mỗi mục {{length}} ký tự.',
    learningGoalsMax: 'Chỉ giữ tối đa {{max}} mục tiêu.',
    learningGoalLength: 'Mỗi mục tiêu tối đa {{length}} ký tự.',
    save: 'Lưu hồ sơ',
    saved: 'Đã lưu hồ sơ.',
    password: {
      title: 'Đổi mật khẩu',
      submit: 'Đổi mật khẩu',
      changed: 'Đã đổi mật khẩu.',
      currentIncorrect: 'Mật khẩu hiện tại không đúng.',
    },
  },
};
