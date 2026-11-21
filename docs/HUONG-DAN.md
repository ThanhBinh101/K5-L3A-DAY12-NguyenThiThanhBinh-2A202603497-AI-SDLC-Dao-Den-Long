# Hướng dẫn tự làm và trình bày Day 12

**Đảo Đèn Lồng · Lab AI SDLC**

Điều khiển Mây gom đom đóm và góp vào Đèn Lồng Lớn, tránh Bóng Mực trong sương. Mục tiêu thay đổi qua bốn phase. Từ Phase 3, giữ đủ đèn cháy đến bình minh để thắng. [Ma trận yêu cầu](YEU-CAU.md) · [Lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)

## Chạy và chơi

Mở Terminal trong thư mục dự án. Dùng Node.js 20 trở lên và chạy máy chủ.

```bash
node --version
npm start
```

Mở địa chỉ máy chủ in ra, mặc định [127.0.0.1:4173](http://127.0.0.1:4173/). Giữ cửa sổ Terminal mở khi chơi. Nhấn `Ctrl+C` khi muốn tắt máy chủ.

| Thao tác | Điều khiển |
|---|---|
| Đi | W/A/S/D hoặc mũi tên |
| Quay camera | Kéo chuột ngang trong vùng chơi |
| Nhảy | Space |
| Lướt | Shift |
| Góp đom đóm vào đèn gần | E |
| Dùng xung làm choáng Bóng Mực | Q |
| Tạm dừng | Esc hoặc P |

Nhấn **Bắt đầu chơi**, đọc tên đêm và vào đảo. Đi tới một cụm đom đóm rồi bấm **E** gần Đèn Lồng Lớn. Có thể góp nhiều lượt. Giữ khoảng cách với Bóng Mực, dùng xung nếu đủ đom đóm. Từ Phase 3, quay lại những đèn đang yếu để thêm nhiên liệu và tạm dừng để xem hướng dẫn. Khi thắng, tiếp tục sang đêm kế. Mở cài đặt để chỉnh độ nhạy camera, cỡ chữ, phụ đề hoặc gán lại phím. Có thể mở bảng điểm từ màn hình chính ở bản cuối.

## Làm theo từng phase

| Phase | Tự làm | Kiểm tra trước khi gắn tag |
|---|---|---|
| 1 | Đọc PRD-0. Ghi luật tự chọn vào `game.contract.json`, dựng vòng chơi và CLI. | Tái lập cùng seed, chạy ca nhặt, góp và thắp đèn cuối. Kiểm đầu ra từng dòng. |
| 2 | Ghi các thông số Ticket-02 bắt buộc. Tách kịch bản nhảy, lướt, tạm dừng, rơi, gió và bùa. | Chạy ca mới cùng kiểm tra v1.0 còn hiệu lực. Xem chênh lệch wall tick và sim tick khi pause. |
| 3 | Đổi mô hình đèn sang fuel, giữ lịch sử, đổi cách xét thắng ở bình minh. | So cùng kịch bản đèn cuối ở hai tag. Thử đèn tắt, thắp lại, điểm và đủ hoặc thiếu đèn khi hết giờ. |
| 4 | Đọc ngưỡng benchmark, soak, quy tắc lưu bảng điểm và yêu cầu tiếp cận. | Chạy phép đo chính thức, clone sạch, mở clip, giải nén gói và thử chạy. |

Một lời nhắc có thể dùng khi điều phối agent trong mỗi phase.

> Đọc yêu cầu và Test Contract của phase. Viết các điều kiện nghiệm thu trước khi sửa. Kèm scenario nhỏ kiểm từng luật và liệt kê luật thay thế. Chạy lệnh thật, giữ đầu ra nguyên bản và ghi các mục chưa kiểm chứng.

## Tự chạy headless

Headless chạy mô phỏng mà không mở cửa sổ. Tạo một thư mục tạm, chuẩn bị trạng thái đầu và gửi một lần bấm tương tác ở tick 1. Scenario dưới đây cô lập nhặt và góp từng phần.

```bash
thu_muc_thu="$(mktemp -d)"
cat > "$thu_muc_thu/scenario.json" <<'JSON'
{
  "player": {"pos": [0, 0, 0], "carried": 1, "flames": 3},
  "random_motes": false,
  "random_shades": false,
  "motes": [[0, 0, 0]],
  "shades": [],
  "lanterns": [{"id": "L1", "pos": [0, 0, 0], "deposited": 0}]
}
JSON
cat > "$thu_muc_thu/inputs.json" <<'JSON'
{"frames": [{"tick": 1, "interact": true}]}
JSON
node tools/headless.mjs --seed 42 --night 1 \
  --scenario "$thu_muc_thu/scenario.json" --inputs "$thu_muc_thu/inputs.json" \
  --ticks 4 --snapshot-every 1 --out "$thu_muc_thu/lan-1.jsonl"
cat "$thu_muc_thu/lan-1.jsonl"
```

Tìm sự kiện `mote_picked` ở tick 1, sau đó `deposit` với `amount: 2` ở tick 2. Đèn vẫn tắt và Mây đã góp hết phần mang theo. Đọc dòng `end` để biết trạng thái sau lần chạy. Muốn kiểm tính tất định, chạy cùng lệnh đổi đích thành `lan-2.jsonl`, rồi dùng `cmp "$thu_muc_thu/lan-1.jsonl" "$thu_muc_thu/lan-2.jsonl"`. Hai tệp giống từng byte thì `cmp` trả mã 0.

```bash
npm test
npm run verify
```

Lệnh đầu chạy test tự động, lệnh thứ hai lưu bằng chứng. Chạy `npm run install-hooks` một lần trên clone để kiểm thử trước khi Git tạo commit. Nếu muốn kiểm đúng tag trong thư mục riêng, dùng lệnh sau.

```bash
git worktree add --detach ../dao-den-long-phase-1 phase-1
cd ../dao-den-long-phase-1
npm test
```

## Đo bản phát hành và quay demo

Ở Phase 4, chạy đúng các phép đo sau rồi mở JSON để đọc cấu hình và kết quả thực tế.

```bash
node tools/bench.mjs --seed 42 --duration 30 --out bench.json
npm run soak -- --seed 7 --nights 10 --out soak.json
node tools/serve.mjs --export-leaderboard leaderboard.json
npm run package
```

Giải nén `dist/dao-den-long-v1.0.0.tar.gz` vào thư mục sạch. Chạy theo tệp hướng dẫn đi cùng gói. Đối chiếu benchmark với AVG FPS ≥ 60, p1 low ≥ 30 và thời gian tải ≤ 10 giây. Đối chiếu soak với số lần crash bằng 0 và tăng RSS ≤ 20%. Lệnh soak dùng Node với `--jitless --max-semi-space-size=1` như khai báo trong contract. Nếu máy chạy chậm hoặc một ngưỡng chưa đạt, giữ đầu ra đo và báo rõ mục đó. [Yêu cầu Phase 4](YEU-CAU.md#phase-4--phát-hành-và-số-đo)

Video MP4 dưới 5 phút. Chiếu một lượt chơi thật, cho thấy điều kiện thắng hoặc thua theo bản hiện tại, rồi mở test, số đo và lịch sử Git. Trên macOS dùng `Cmd + Shift + 5` để quay một vùng. Nếu cần chuyển định dạng, dùng FFmpeg.

```bash
ffmpeg -i ban-quay.mov -t 299 -c:v libx264 -crf 26 -preset fast -c:a aac demo.mp4
```

## Nộp và chuẩn bị bảo vệ

Repo cá nhân Public mang tên `K5-L3A-DAY12-NguyenThiThanhBinh-2A202603497-AI-SDLC-Dao-Den-Long`. Đối chiếu `git remote -v` trước khi phát hành. Push bốn tag đúng commit, tạo GitHub Release `v1.0.0`, đính gói chạy và video. Nếu commit video vào repo, dùng `docs/demo/demo.mp4`, giữ dưới 100 MB và đặt link ở đầu README. Thử mở bằng cửa sổ ẩn danh. Kiểm hạn tính theo GitHub và gửi link theo hướng dẫn Coach. [Checklist chính thức](../SUBMISSION.md)

Chuẩn bị giải thích vì sao Phase 3 chuyển thời điểm xét thắng, cách đọc một scenario, cách tái lập cùng seed và yếu tố nào làm phép đo cục bộ thay đổi. Đối chiếu trạng thái thực tế và số liệu trong [báo cáo](BAO-CAO.md).
