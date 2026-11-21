# Phase 4 · Ticket-04 và Test Contract v1.3

## Phạm vi

Giữ hồi quy cơ chế v1.2, thêm bảng điểm, khả năng tiếp cận, gói chạy, kiểm thử tải đồ họa và mô phỏng kéo dài. Nhập kết quả so với điều kiện của Ticket-04 vào báo cáo bằng đầu ra thật. [Hướng dẫn chạy](HUONG-DAN.md#đo-bản-phát-hành-và-quay-demo)

## Bằng chứng cần có

| Yêu cầu | Tệp hoặc cách kiểm |
|---|---|
| Headless | `npm test` và `npm run verify` ở đúng commit, gồm hồi quy Phase 1–3. |
| Hiệu năng | Benchmark seed 42, 30 giây, khung 1280×720, 200 Bóng Mực, 100 đom đóm, ba đèn có nhiên liệu 100. FPS trung bình ≥ 60, p1 low ≥ 30, thời gian tải ≤ 10 giây. |
| Ổn định | Soak seed 7 trong 10 đêm, không crash, tăng RSS ≤ 20%. Chạy theo `soak_cmd` trong contract. |
| Bảng điểm | Xuất bằng CLI, kiểm giới hạn 10, sắp điểm giảm dần và ưu tiên thời điểm sớm khi điểm bằng nhau. |
| Tiếp cận và chơi được | Kiểm menu, điều khiển bàn phím, tùy chọn cảm giác camera và giao diện, ảnh hoặc clip làm bằng chứng. |
| Phát hành | Thử gói từ thư mục sạch, xem clip MP4 dưới 5 phút, xác nhận tag và Release mở được trên repo Public. |

Điểm và phát hành chỉ ghi đạt sau khi có kết quả đo hoặc URL thật. [Báo cáo](BAO-CAO.md) · [Bằng chứng Phase 4](proof/phase-4/)

## Dùng AI và đánh giá

Phân riêng triển khai giao diện, benchmark, soak, lưu bảng điểm và kiểm chứng. Trước hết thử bài đo với thời lượng ngắn để tìm lỗi thiết lập, sau đó mới chạy đủ 30 giây. Lưu máy, độ phân giải, cách tính FPS và RSS để người khác đối chiếu. Ước lượng 5.000–8.000 token văn bản cho phần tài liệu, bản ghi trao đổi và phần mã đo, theo quy đổi khoảng bốn ký tự mỗi token.
