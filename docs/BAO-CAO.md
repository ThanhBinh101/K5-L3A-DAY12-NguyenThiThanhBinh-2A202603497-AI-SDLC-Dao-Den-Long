# Báo cáo Day 12 · Đảo Đèn Lồng

**Nguyễn Thị Thanh Bình · 2A202603497 · K5-L3A**

## Mục tiêu và phạm vi

Áp dụng SDLC với AI để xây game 3D góc nhìn thứ ba. Mây gom đom đóm, góp vào Đèn Lồng Lớn và đối phó Bóng Mực. PRD-0 xác lập vòng chơi và hợp đồng kiểm thử. Ticket-02 chuẩn hóa thông số và thêm cơ chế. Ticket-03 chuyển mục tiêu sang giữ đèn qua đêm. Ticket-04 bổ sung yêu cầu phát hành, hiệu năng và tiếp cận. [Ma trận yêu cầu](YEU-CAU.md) · [Lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)

## Thời điểm thực hiện và giới hạn

Lab board được mở khi cả bốn phase đã hiển thị. Mã và bằng chứng được kiểm theo từng phiên bản rồi gắn các tag riêng theo thứ tự. Thời điểm các tag có mặt trên GitHub là lúc thực sự đẩy lên repo. Các tag của phase trước có thể xuất hiện sau mốc yêu cầu, và Coach quyết định cách tính tiến độ. Kết quả trong báo cáo là các phép kiểm cục bộ. Bộ test ẩn và phép đo trên máy chấm chưa được chạy.

## Thiết kế và giả định

- Dùng WebGL 2 cho cảnh 3D, JavaScript cho mô phỏng và Node.js cho CLI. Lõi dùng bước cố định 60 Hz. Browser và headless chia sẻ luật, nên kiểm thử có thể đổi seed hoặc đầu vào mà không cần khởi động trình duyệt. [ADR 001](ADR-001.md)
- Màu hồng pastel, Mây, cảnh trí và phản hồi ánh sáng là lựa chọn mỹ thuật. Dữ liệu chấm của mỗi phase dựa vào Test Contract tương ứng. [Nguồn tài sản](../CREDITS.md)
- Tham số Phase 1 được khai báo trong `game.contract.json`. Từ Phase 2 dùng các con số được Ticket-02 chuẩn hóa. Các ví dụ tọa độ và thông số thay thế được liệt kê trong bảng yêu cầu.
- Giữ một phép kiểm tra cho tình huống đèn cuối để thấy rõ luật chuyển tiếp. Kỳ vọng là thắng ngay ở v1.0/v1.1 và vẫn đang chơi trước bình minh ở v1.2/v1.3. [Changelog](../CHANGELOG.md)

## Ma trận kiểm chứng

| Phase | Yêu cầu và kịch bản | Trạng thái bằng chứng |
|---|---|---|
| 1 | Mô phỏng JSONL theo seed, snapshot theo chu kỳ, góc camera, nhặt và góp, thắng khi thắp đèn cuối, cờ lỗi. | 8/8 test đạt. Đầu ra chạy lại trùng từng byte. [Log](proof/phase-1/node-test.txt) · [JSONL](proof/phase-1/night-1.jsonl) |
| 2 | Ba bố cục, schema mở rộng, tạm dừng, di chuyển, xung, trúng đòn và rơi. | 16/16 test đạt. Cả ba đêm phát lại cho đầu ra trùng từng byte. [Log](proof/phase-2/node-test.txt) · [Môi trường](proof/phase-2/run.json) |
| 3 | Điều kiện bình minh, fuel, sức chứa, thắp lại, điểm và thay đổi kết quả ở đèn cuối. | 22/22 test đạt. Kiểm hết nhiên liệu, thắp lại và hút lửa, ngưỡng bình minh và ưu tiên hết lửa. [Log](proof/phase-3/node-test.txt) · [Môi trường](proof/phase-3/run.json) |
| 4 | Benchmark với khung hình và tải được quy định, soak 10 đêm, bảng điểm, khả năng tiếp cận và gói chạy. | 23/23 test cục bộ đạt, gồm lưu, sắp xếp và xuất bảng điểm. [Log](proof/phase-4/node-test.txt) · [Môi trường](proof/phase-4/run.json) |

[Ghi chép Phase 1](phase-1.md) · [Phase 2](phase-2.md) · [Phase 3](phase-3.md) · [Phase 4](phase-4.md)

Rà soát độc lập đường lên đèn cao nhất ở Đêm 3 bằng các bước mô phỏng. Mây đi từ vị trí xuất phát qua dốc phía đông, lên cao độ 3, dùng đệm nhảy và tiếp đất ở cao độ 6. Tương tác sau khi tiếp đất phát đúng sự kiện `lantern_lit` cho L1.

Các kịch bản có thể tái lập theo contract tại mỗi tag. [Test CLI theo phiên bản](../tests/contract.test.mjs)

## Kiểm chứng bản cuối

Benchmark 30 giây ở 1280×720 với 200 Bóng Mực, 100 đom đóm và 3 đèn sáng. Apple M2, Chrome/ANGLE Metal, VSync tắt. FPS trung bình đạt 364,424 và p1 low đạt 108,932. Thời gian khung p95 là 4,8 ms và thời gian tải là 2.963 ms. Cả ba ngưỡng của Ticket-04 đều đạt trên máy này. Bản web trả `null` cho RSS benchmark. [Đầu ra benchmark](../bench.json)

Đã tái lập ba tag đầu từ bản xuất Git sạch. JSONL tái chạy giống từng byte với kết quả ghi ở đúng tag. Ba đêm theo thời lượng v1.3, với spawn mối nguy và gió tắt để chạy đến bình minh, đều hoàn thành dưới 1,1 giây trên máy kiểm tra. [Tái lập tag](proof/phase-4/historical-tag-replay.json) · [Thời gian headless](proof/phase-4/headless-full-durations.json)

Video H.264 dài 69,55 giây, 1.280×720 và 10,63 MB. Video ghi thao tác gom đom đóm, Tỏa Sáng, thắp đèn và tạm dừng trong trình duyệt, cùng kết quả chạy test và benchmark. [Video](demo/demo.mp4)

### Soak và ổn định

Lệnh khai báo trong contract chạy 10 đêm với seed 7 trên Apple M2 arm64, Node.js 23.11.0. Mô phỏng ngẫu nhiên kết thúc 10 đêm với 0 crash. Mười kết quả là thua theo luật game. RSS tăng từ 35,406 lên 39,984 MB, tương đương 12,93%, dưới ngưỡng 20%. Thời lượng đo 1,0425 giây. [Đầu ra soak](../soak.json) · [Lệnh trong contract](../game.contract.json)

Lần thử ban đầu với runtime JIT mặc định vượt ngưỡng RSS. Bản cuối giảm cấp phát theo tick và khai báo runtime thông dịch với `--jitless --max-semi-space-size=1` cho phép đo soak. Cấu hình này giữ cùng lõi mô phỏng và cùng chuỗi input ngẫu nhiên. Phép đo FPS chạy riêng trong trình duyệt.

### Tiếp cận và kiểm tra UI

Kiểm tra trực tiếp trình duyệt xác nhận cỡ chữ tăng từ 18 lên 22,5 px, đổi phím pause sang J, chặn phím bị trùng và giữ cài đặt sau khi tải lại. Tuỳ chọn phụ đề hiển thị cảnh báo những giây cuối. Sau một ván thua, có thể lưu điểm, mở bảng xếp hạng, thấy dòng điểm và chọn dòng đó.

### Bảng điểm

Kịch bản gửi đồng thời 12 bản ghi có tên hợp lệ, thử một tên sai, đóng rồi mở lại máy chủ và xuất kết quả qua CLI. Tệp xuất giữ 10 bản ghi. Thứ tự là điểm cao trước và thời điểm sớm trước khi bằng điểm. Các bản ghi trong tệp là dữ liệu thử nhằm kiểm thứ tự, định dạng và lưu qua lần khởi động. [Tệp xuất trên dữ liệu thử](proof/phase-4/leaderboard-fixture.json) · [Test bảng điểm](../tests/leaderboard.test.mjs)

## Harness và ghi chép sử dụng AI

| Công việc | Cách dùng AI và kiểm chứng |
|---|---|
| Tìm đề | Codex rà soát bài lab và upstream. Chỉ dùng yêu cầu chi tiết sau khi người dùng mở được lab board, sau vòng dựng preview từ mô tả công khai. |
| Đọc yêu cầu | Đọc lần lượt PRD và ticket, rút các tiêu chí cần kiểm ở từng bản, tách riêng các thay đổi phá kỳ vọng cũ. |
| Triển khai | Phân công logic, giao diện, công cụ đo và kiểm tra độc lập. Duy trì một lõi mô phỏng cho CLI và browser. |
| Kiểm chứng | Chạy test tự động, so bằng chứng lặp, chạy scenario cô lập và kiểm tra bản giải nén trước khi coi đạt. |
| Theo dõi | Đặt hướng dẫn trong `AGENTS.md`, lưu skill kiểm chứng, chạy CI và dùng hook pre-commit để yêu cầu test xanh. |

Ước lượng riêng lượt đọc tài liệu chung và viết hướng dẫn, báo cáo preview là khoảng 12.000 token văn bản, theo quy đổi thô bốn ký tự Unicode mỗi token. Bốn ghi chép phase ước tính thêm 19.000–28.000 token nội dung hữu hình. Cộng các phần đã ước tính cho khoảng 31.000–40.000 token văn bản. Tổng này không bao gồm ngữ cảnh lặp, suy luận nội bộ hay token tính phí do dịch vụ ghi nhận. Giảm lượng ngữ cảnh bằng cách truyền bảng thông số, phạm vi tệp và tiêu chí test cho từng agent thay vì lặp lại toàn bộ đề. Khi cần sửa một cơ chế, chạy scenario ngắn trước, rồi chạy hồi quy. [Hướng dẫn agent](../AGENTS.md) · [Skill kiểm chứng](../.agents/skills/verify-game/SKILL.md) · [CI](../.github/workflows/verify.yml)

## Đánh giá và retro

- Giai đoạn preview kiểm tra đường dựng web, ghi hình, hook và đóng gói. Giá trị gameplay trong preview khác Test Contract công bố sau khi mở board, nên kết quả của preview chỉ dùng để kiểm đường dựng công cụ. Lịch sử Git giữ nguyên lần thử.
- Rà soát công cụ preview phát hiện CLI chưa được đưa vào định danh bằng chứng, và lần chạy lỗi có thể để sót tóm tắt từ lần xanh trước. Sau đó thêm đầu vào của fingerprint, xóa tóm tắt cũ trước lúc chạy và gọi rõ tệp test.
- Kiểm thử CLI đầu tiên cho đầu vào sai trả 1. Scenario theo Test Contract yêu cầu mã 2, nên cách báo lỗi tham số và tệp đọc đã được sửa trước khi gắn tag Phase 1.
- Rà soát ảnh thử màn thắng phát hiện hướng dẫn đi đến đèn tiếp theo vẫn hiện. Giao diện đã sửa để ẩn gợi ý khi kết thúc ván. Kiểm thử đồ họa cần xem cả lúc chơi và sau khi thắng hoặc thua.
- Kiểm tra computed style ở 1280×720 phát hiện nút chữ lớn đã lưu cài đặt nhưng chưa đổi kích cỡ. Sau khi sửa vị trí khai báo CSS, kiểm tra lại cho thấy 18 px tăng lên 22,5 px.
- Nếu làm lại, mở board trước khi chọn schema, lưu một ca kiểm xác nhận điều kiện thắng và dữ liệu JSONL ở đầu mỗi phase. Giữ footage ngắn ngay sau khi chốt từng tag để video cuối có đủ bằng chứng.

[Hướng dẫn thực hành](HUONG-DAN.md) · [Rubric](../RUBRIC.md) · [Checklist nộp bài](../SUBMISSION.md)
