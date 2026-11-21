# Đảo Đèn Lồng

**[Video demo MP4](docs/demo/demo.mp4)** · [Báo cáo](docs/BAO-CAO.md) · [Hướng dẫn tự làm](docs/HUONG-DAN.md)

Game 3D góc nhìn thứ ba cho lab Day 12 AI SDLC. Bạn điều khiển Mây, gom đom đóm và thắp ba Đèn Lồng Lớn trong khi tránh Bóng Mực.

Bản preview dựa trên mô tả trong [đề chung](docs/LAB-README.md). Trạng thái đối chiếu PRD-0, Ticket-02/03/04 và Test Contract chính thức được ghi trong báo cáo.

## Chạy game

Cần Node.js từ 20 và trình duyệt hỗ trợ WebGL2. Trong thư mục repo, chạy:

```bash
npm start
```

Mở [http://127.0.0.1:4173](http://127.0.0.1:4173), chọn **Bắt đầu chơi**.

| Điều khiển | Tác dụng |
|---|---|
| WASD hoặc mũi tên | Di chuyển. Đi qua đom đóm để nhặt. |
| E | Thắp đèn gần nhất nếu đủ đom đóm. |
| R | Chơi lại. |
| Nút trên màn hình cảm ứng | Di chuyển và thắp đèn. |

Mỗi đèn cần 3 đom đóm. Thắp cả ba để thắng. Mây bắt đầu với 3 tim, và mỗi lần va chạm Bóng Mực hợp lệ sẽ mất 1 tim.

## Kiểm chứng

```bash
npm run verify
node tools/headless.mjs tests/scenarios/island.json
npm run bench
```

Headless nhận JSON từ đường dẫn tệp hoặc stdin với `-`. Mỗi phần tử `steps` chứa số `ticks` và các nút giữ trong khoảng đó. `light` là thao tác nhấn một lần. Đầu ra là một JSON có vị trí cuối, số tim, đom đóm, đèn, va chạm và nhật ký sự kiện. [Chạy lại bằng chứng và đọc đầu ra](docs/HUONG-DAN.md).

`npm run package` tạo gói local `dist/dao-den-long-preview.tar.gz`. Sau khi giải nén, chạy `node tools/serve.mjs`. Bản này cũng có thể chạy từ máy chủ web tĩnh.

## Sáng tạo của tôi

Mây mặc áo choàng hồng và nơ phía sau. Đảo mang màu hoa đào, có hoa nhỏ và một lối đi dẫn đến đèn đầu tiên. Đèn đã thắp đổi sang màu vàng ấm, và mỗi sự kiện gom đom đóm, thắp đèn hoặc bị chạm có một âm báo riêng khi bật âm thanh. Các hiệu ứng trình duyệt dùng cùng trạng thái gameplay với CLI. Xem cảnh chơi trong video demo.

[Nguồn và công cụ](CREDITS.md) · [Giấy phép mã](LICENSE) · [Rubric](RUBRIC.md)
