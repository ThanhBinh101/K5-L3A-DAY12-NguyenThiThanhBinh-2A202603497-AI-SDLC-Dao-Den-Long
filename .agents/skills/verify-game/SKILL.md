---
name: verify-game
description: Chạy test và lưu bằng chứng tái lập sau khi thay đổi luật chơi, CLI hoặc trước khi gắn tag Day 12.
---

1. Đọc yêu cầu chính thức của phase đang làm và ghi nhận luật nào đổi.
2. Chạy `npm run verify`. Nếu lỗi, sửa cho đến khi exit 0. Giữ output gốc từ lần chạy.
3. Đọc `docs/proof/run.json`, ba output headless và `node-test.txt`. Đối chiếu kết quả với tiêu chí trước khi chấm đạt.
4. Chạy `npm start` và kiểm tra bắt đầu, điều khiển, thắp đèn và màn kết thúc nếu sửa trình duyệt.
5. Chuyển diff cùng lệnh tái lập cho người hoặc agent khác review. Khi đủ điều kiện phát hành mới đánh tag phase.
