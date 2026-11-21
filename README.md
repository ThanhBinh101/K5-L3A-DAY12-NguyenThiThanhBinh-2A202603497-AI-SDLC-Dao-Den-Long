# Đảo Đèn Lồng

Game 3D của Day 12 AI SDLC. Mây đội nón lá có đèn nhỏ, gom đom đóm và mang ánh sáng trở về Đảo Bến, Đảo Cau và Đảo Chuông. Xem [yêu cầu Phase 1](docs/phase-1.md) · [yêu cầu Phase 2](docs/phase-2.md) · [yêu cầu Phase 3](docs/phase-3.md).

## Chạy

Cần Node.js 20+ và trình duyệt hỗ trợ WebGL2 trên macOS hoặc Linux.

```bash
npm start
```

Mở http://127.0.0.1:4173 và bấm **Bắt đầu chơi**.

| Phím | Hành động |
| --- | --- |
| WASD hoặc mũi tên | Di chuyển |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất |
| Q | Tỏa Sáng nếu có ít nhất ba đom đóm |
| Shift | Lướt |
| Esc hoặc P | Tạm dừng |
| Kéo chuột trên cảnh 3D | Xoay camera |
| R | Chơi lại |

Giữ đèn sáng đến bình minh. Mây cần còn ít nhất một Ngọn Lửa cùng tối thiểu 3/5, 4/6 và 5/7 đèn sáng ở từng đêm. Đèn hao dầu và có thể tắt. Bấm E để nạp hoặc châm dầu. Đèn từng sáng cần năm đom đóm để thắp lại.

## Kiểm tra

```bash
npm run verify
node tools/headless.mjs --seed 42 --night 1 --ticks 300 --out run.jsonl
```

Đọc [Test Contract khai báo](game.contract.json). Lựa chọn mỹ thuật gồm nơ hồng, cánh hoa và cảnh đảo cổ tích. Các chi tiết trang trí chỉ ở bộ hiển thị WebGL. Xem [nguồn](CREDITS.md) và [giấy phép](LICENSE).
