# Quay lại demo Đảo Đèn Lồng

Video ghi hình giao diện game 3D. Trình quay dùng Playwright bấm nút **Bắt đầu chơi**, gửi các phím **W**, **A**, **D** và **E** vào trình duyệt, rồi kiểm tra HUD và màn hình thắng. Đồng hồ mô phỏng giúp nhập đúng số bước khi quay lại trên máy khác. Phụ đề tiếng Việt được chèn trong lúc quay. Phần kiểm chứng hiển thị đầu ra của `npm run verify` chạy trên máy quay.

Để dựng lại video trên macOS, cần Node.js 20+, Chrome, Playwright và bộ công cụ dòng lệnh Xcode. Từ thư mục repo chạy lệnh sau.

```bash
node tools/record-demo.mjs
```

Trình quay nhận `DEMO_PLAYWRIGHT` là đường dẫn tới thư mục gói Playwright và `DEMO_CHROME` là đường dẫn tới tệp thực thi Chrome nếu chúng được cài ngoài vị trí mặc định. Đầu ra là `docs/demo/demo.mp4` và ảnh gameplay `docs/demo/gameplay.jpg`. Quá trình quay xác nhận đã thắp 3/3 đèn và còn đủ 3 tim trước khi xuất cảnh thắng.
