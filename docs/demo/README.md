# Quay lại demo Đảo Đèn Lồng

Video ghi hình giao diện game 3D. Trình quay bấm **Bắt đầu chơi**, gửi phím **WASD**, **Q**, **E** và **P** vào trình duyệt, rồi kiểm tra lượng đom đóm, số đèn sáng, Lửa Tim và menu tạm dừng. Đồng hồ mô phỏng giúp nhập đúng số bước khi quay lại trên máy khác. Phụ đề tiếng Việt được chèn trong lúc quay. Phần kiểm chứng hiển thị đầu ra của `npm run verify` chạy trên máy quay.

Để dựng lại video trên macOS, cần Node.js 20+, Chrome, Playwright và bộ công cụ dòng lệnh Xcode. Từ thư mục repo chạy lệnh sau.

```bash
DEMO_BENCH_JSON=docs/proof/phase-4/bench.json node tools/record-demo.mjs
```

Biến `DEMO_BENCH_JSON` trỏ tới kết quả benchmark đã đo để đưa vào phần bằng chứng. Trình quay nhận `DEMO_PLAYWRIGHT` là đường dẫn tới thư mục gói Playwright và `DEMO_CHROME` là đường dẫn tới tệp thực thi Chrome nếu chúng được cài ngoài vị trí mặc định. Đầu ra là `docs/demo/demo.mp4` và ảnh gameplay `docs/demo/gameplay.jpg`.
