/* =========================================================
   MAGASIN — CẤU HÌNH HỆ THỐNG
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa các hằng số cấu hình dùng chung. Không đổi tên hằng số để tránh ảnh hưởng mã hiện tại.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

const USER_HEADERS = ['Id','Tên đăng nhập','Họ tên','Email','Số điện thoại','Muối mật khẩu','Mã băm mật khẩu','Vai trò','Trạng thái','Muối xác thực','Mã xác thực','Hết hạn mã','Số lần thử','Ngày tạo','Ngày xác thực','Phạm vi truy cập'];

const OPERATIONAL_SHEET_DEFS = {
  'Lịch làm việc': [
    'Id','Ngày','Ca','Giờ bắt đầu','Giờ kết thúc',
    'Cửa hàng','Người dùng','Trạng thái','Người duyệt','Ngày duyệt','Ghi chú'
  ],
  'Chấm công': [
    'Id','Ngày','Người dùng','Cửa hàng','Check-in','Check-out',
    'Trạng thái','Đi muộn phút','Về sớm phút','Ghi chú','Ngày tạo',
    'Họ tên','Ca','Bậc NV','Đơn giá giờ','Giờ công','Thành tiền','Giờ ca bắt đầu','Giờ ca kết thúc'
  ],
  'Bậc nhân viên': [
    'Id','Người dùng','Họ tên','Bậc NV','Đơn giá giờ','Trạng thái','Ngày cập nhật'
  ],
  'Đổi ca': [
    'Id','Ngày gửi','Người gửi','Ca hiện tại','Ca đề nghị',
    'Cửa hàng','Lý do','Trạng thái','Người duyệt','Ngày duyệt','Ghi chú'
  ],
  'KPI': [
    'Id','Kỳ','Người dùng','Cửa hàng','Chỉ tiêu','Kết quả',
    'Trọng số','Điểm','Người đánh giá','Ngày cập nhật','Ghi chú'
  ],
  'Cửa hàng': [
    'Id','Mã cửa hàng','Tên cửa hàng','Trạng thái','Ngày cập nhật','Ghi chú'
  ]
};

const SESSION_PREFIX = 'BREWFLOW_SESSION_';

const SESSION_DURATION = 21600;

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const LOGIN_ATTEMPT_PREFIX = 'MAGASIN_LOGIN_ATTEMPT_';
const LOGIN_ATTEMPT_MAX = 5;
const LOGIN_ATTEMPT_DURATION = 15 * 60;

const PASSWORD_RESET_PREFIX = 'BREWFLOW_PASSWORD_RESET_';

const PASSWORD_RESET_DURATION = 30 * 60; // 30 phút

const MAX_ROWS_PER_REQUEST = 5000;
