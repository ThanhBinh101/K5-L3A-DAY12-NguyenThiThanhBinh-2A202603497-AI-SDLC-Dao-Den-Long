# Phase 1 · PRD-0 và Test Contract v1.0

## Phạm vi

Bản đầu là một đêm chơi trên đảo, camera theo Mây từ phía sau. Thắp đủ năm Đèn Lồng Lớn thì thắng ngay. Hết giờ từ bình minh hoặc mất toàn bộ lửa thì thua. Người chơi gom đom đóm, góp từng phần vào đèn và dùng xung để tránh Bóng Mực. [Yêu cầu gốc](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)

## Các thông số tự chọn

Đảo đêm đầu có bán kính 40. Mây có ba lửa, tốc độ 6 và sức chứa 10. Thời gian tối đa 300 giây. Đèn cần 10 đom đóm, phạm vi tương tác 2. Phạm vi nhặt 1. Xung tốn 3 đom đóm, phạm vi 5 và hồi chiêu 3 giây. Bóng Mực bị làm choáng 2 giây trong vùng xung. Các số dùng để chấm được công bố trong contract. [Khai báo v1.0](../game.contract.json)

## Tiêu chí nghiệm thu

| Yêu cầu | Kiểm tra |
|---|---|
| Bản chơi được | Mở trình duyệt, di chuyển Mây, nhặt đom đóm và góp vào đèn. Kiểm cảnh 3D nhìn thấy Mây và HUD phản hồi. |
| Nhặt và góp | Mây bắt đầu mang 1 đom đóm, nhặt thêm 1 rồi góp 2. Đèn ghi số đã góp và vẫn tắt. Đầu ra có `mote_picked` và `deposit`. |
| Đèn cuối | Dựng bốn đèn đã sáng và đèn cuối còn thiếu 2. Góp đủ phải phát `lantern_lit` và `game_over` với lý do `all_lit`. |
| Điều khiển theo camera | Với góc camera 90 độ, hướng lên di chuyển về +X qua nhiều tick. Đổi tần suất ghi snapshot giữ nguyên trạng thái cuối. |
| Hợp đồng dòng lệnh | Kết quả là JSONL, snapshot bắt đầu ở tick 0, kết thúc bằng một dòng `end`. Cờ sai trả mã lỗi 2. Chạy lặp cùng đầu vào và seed phải cho cùng đầu ra. |

Dùng `npm test` để chạy tự động và `npm run verify` để lưu log thô. Hạng mục hình ảnh cần xem trực tiếp bản chạy. [Test CLI](../tests/contract.test.mjs) · [Bằng chứng Phase 1](proof/phase-1/)

## Nhật ký AI và đánh giá

Sau khi đọc PRD-0 trên lab board, thay hoàn toàn giao diện CLI thử bằng Test Contract v1.0. Codex phân vai thiết kế lõi, UI và kiểm tra độc lập. Người kiểm tra viết kịch bản nhặt và góp, thắp đèn cuối, chạy lặp và cờ lỗi từ đề trước khi xem kết quả. Bản đồ, điểm và tham số từ vòng dựng preview được rà lại theo contract để tránh dùng nhầm bằng chứng cũ.

Ước lượng khoảng 8.000–10.000 token nội dung hữu hình cho phần mã và đặc tả Phase 1 theo quy đổi khoảng bốn ký tự mỗi token. Ước lượng dùng quy mô các tệp game, bản đồ, CLI và test, không phải số đo tính phí. Để giảm ngữ cảnh, mỗi agent nhận phần thông số và phạm vi tệp của mình, chạy ca nhỏ trước khi chạy hồi quy. Giữ lệnh test trong hướng dẫn agent và hook pre-commit. [Harness](../AGENTS.md)
