# Báo cáo Day 12 · Đảo Đèn Lồng

**Nguyễn Thị Thanh Bình · 2A202603497 · K5-L3A**  
**Đề bài** Day 12 — AI SDLC

## Mục tiêu và phạm vi

Xây dựng game 3D góc nhìn thứ ba. Mây gom đom đóm để thắp các Đèn Lồng Lớn và né Bóng Mực trong sương đen. Quy trình gồm bốn lượt đọc yêu cầu, thiết kế cách kiểm chứng, thực hiện và phát hành. Mỗi tag cần đi kèm bằng chứng có thể tái lập. Đề và Test Contract từng phase được phát hành ở [lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW).

Trạng thái trong báo cáo chỉ phản ánh kiểm chứng đã ghi lại. Yêu cầu chi tiết, tên trường, thời gian, ngưỡng và thay đổi giữa các phase cần đối chiếu với PRD-0 và các ticket tương ứng. Bộ kiểm thử của giảng viên là bộ ẩn.

## Quy trình SDLC và các mốc

| Mốc | Đầu vào | Mục tiêu kiểm chứng | Trạng thái đối chiếu hợp đồng |
|---|---|---|---|
| Phase 1 | PRD-0 và Test Contract | Bản đầu chơi được, headless đúng định dạng, scenario tái lập | Chờ nội dung board |
| Phase 2 | Ticket-02 | Xác nhận phần mở rộng và chạy lại hồi quy | Chờ nội dung board |
| Phase 3 | Ticket-03 | Xác định luật bị thay. Cập nhật thiết kế, test và lý do | Chờ nội dung board |
| Phase 4 | Ticket-04 | Kiểm theo ngưỡng đo, cài sạch trong tối đa ba lệnh, gói chạy và video | Chờ nội dung board |

## Ma trận bằng chứng

| Hạng mục | Cách kiểm chứng | Bằng chứng cần lưu | Kết quả |
|---|---|---|---|
| Chơi bằng camera góc nhìn thứ ba | Chạy game và điều khiển Mây trên đảo | [Gameplay](demo/demo.mp4) | Quan sát được Mây và góc nhìn bám theo khi di chuyển. |
| Gom đom đóm và thắp đèn | Chơi tình huống thiếu và đủ đom đóm, đối chiếu thay đổi của HUD | Scenario nguồn, đầu ra nguyên bản và đoạn demo | Headless thắng với 9 đom đóm và 3 đèn. Trường hợp thiếu đom đóm giữ đèn tắt. Gameplay hiện đủ 3/3 đèn và màn thắng. |
| Bóng Mực và sương đen | Chạy trường hợp nằm trong phạm vi ảnh hưởng theo luật của phase | Test hoặc scenario và video | Headless thua khi Bóng Mực gây ba đòn và Mây hết tim. Cảnh trình duyệt hiển thị Bóng Mực và nền sương. Luật sương chi tiết chờ ticket. |
| Tính tất định của headless | Chạy cùng đầu vào hai lần và so từng byte | Tệp scenario, lệnh, đầu ra và kết quả so sánh | Ba scenario chạy hai lần đều cho đầu ra trùng từng byte. |
| Hồi quy phần còn hiệu lực | Chạy lại test ở tag mới. Ghi lý do khi ngưỡng hoặc luật đổi | Log kiểm thử theo tag và diff test có liên quan | Chờ ticket và các bản chạy |
| Hiệu năng và ổn định | Đo lặp tuyến chơi headless rồi đối chiếu điều kiện chính thức khi có Ticket-04 | [Số đo logic tại máy](proof/local-benchmark.json) | 1.610.000 tick trong 488,19 ms ở lượt ghi log. Chờ ngưỡng chính thức. |
| Tái lập từ bản sạch | Kiểm tra từ bản clone cục bộ và giải nén gói vào thư mục riêng | [Log clone sạch](proof/clean-replay.txt) | Bản clone đạt 12/12. Tệp bằng chứng trùng từng byte và sáu URL trong gói đều trả HTTP 200. Chưa kiểm bản clone public. |
| Video và phát hành | Đối chiếu gameplay, cảnh kiểm chứng và dữ liệu MP4 | [Video cục bộ](demo/demo.mp4) | Video bản thử dưới 5 phút. Còn chờ tag và Release GitHub theo đề từng phase. |

### Kiểm tra độc lập tại máy

Kiểm tra chạy trên macOS 26.5.1, arm64, Node.js 23.11.0. Lệnh `npm test` chạy 12 test, đạt 12, không lỗi và không bỏ qua. Cả ba scenario bên dưới chạy lặp và cho đầu ra giống từng byte. Kiểm tra độc lập cũng đối chiếu kết quả khi chạy từ tệp và khi đưa cùng nội dung qua stdin. Đầu vào thiếu `steps` trả mã lỗi 1, stdout rỗng và có thông báo trên stderr. [Log test](proof/node-test.txt) · [Thông tin máy và định danh mã nguồn](proof/run.json)

| Scenario của bản thử | Kết quả quan sát |
|---|---|
| Đi theo tuyến đom đóm gốc và thắp cả ba đèn | `won` ở bước 322. Nhặt 9 đom đóm, thắp 3 đèn, còn 3 tim. [Đầu vào](../tests/scenarios/island.json) · [Đầu ra](proof/island.json) |
| Đứng cùng vị trí với Bóng Mực, có 3 tim ban đầu | `lost` ở bước 241 sau khi trúng đòn ở các bước 1, 121 và 241. [Đầu vào](../tests/scenarios/contact.json) · [Đầu ra](proof/contact.json) |
| Thử thắp đèn khi thiếu đom đóm | `playing` ở bước 1. Đèn vẫn tắt, túi còn 1 đom đóm và xuất hiện sự kiện `need-fireflies`. [Đầu vào](../tests/scenarios/empty-lantern.json) · [Đầu ra](proof/empty-lantern.json) |

### Hiệu năng và gói chạy

`npm run bench` chạy tuyến thắng mặc định 5.000 lần (1.610.000 tick). Trên Apple M2 arm64 và Node.js 23.11.0, lượt lưu bằng chứng mất 488,19 ms, tương đương 3.297.875 tick mỗi giây. Phép đo bao gồm tạo trạng thái, mô phỏng và tạo kết quả. Kết quả chỉ áp dụng cho logic headless. WebGL, trình duyệt và đọc ghi tệp nằm ngoài phép đo. Chưa đối chiếu với ngưỡng Ticket-04. [Đầu ra benchmark](proof/local-benchmark.json)

`npm run package` tạo `dist/dao-den-long-preview.tar.gz`. Trong lần kiểm độc lập, gói được giải nén vào thư mục tạm sạch và chạy với `node tools/serve.mjs --port 0`. Trang chính, CSS và bốn mô-đun game đều tải được với HTTP 200 và nội dung khác rỗng. [Lệnh chạy gói](HUONG-DAN.md#4-đo-hiệu-năng-và-thử-gói-chạy)

Bản clone cục bộ tại commit `9f6a29b` chạy đạt 12/12 test. Ba tệp scenario và `run.json` trùng từng byte với kết quả đã lưu. Thử làm một test thất bại trong bản clone tạm khiến hook pre-commit trả mã 1 và Git giữ nguyên commit hiện tại. [Log chạy lại](proof/clean-replay.txt)

## Quyết định thiết kế và giả định

- Bản thử dùng JavaScript, WebGL 2 và Node.js. Logic ở `src/game.mjs` cập nhật theo bước cố định. Giao diện chơi và trình chạy scenario headless đều gọi logic này. Chế độ dòng lệnh nhận JSON qua đường dẫn hoặc stdin, xuất JSON qua stdout và báo lỗi qua stderr.
- Bản thử đặt ba đèn, ba tim, và dùng ba đom đóm để thắp mỗi đèn. Mây nhặt đom đóm khi đến gần, bấm `E` khi tương tác và thắng khi toàn bộ đèn sáng. Các giá trị này là giả định bản thử, chờ đối chiếu tài liệu từng phase.
- Màu hồng pastel là định hướng tạo hình theo yêu cầu người dùng. Các đối tượng cần phân biệt được trong lúc chơi, đặc biệt là vật phẩm, đèn và mối nguy.
- Đồ họa và giao diện có thể thêm chi tiết kể chuyện. Chỉ số, trạng thái và schema headless cần bám contract của từng phase.
- Các mục mơ hồ cần ghi ở phase tương ứng, như hành vi ở ranh giới vùng tương tác, thứ tự xử lý sự kiện trong cùng một bước và cách đầu vào sai được báo lỗi. Ví dụ trong bản thử, nhặt đom đóm được xử lý trước thắp đèn khi cùng xảy ra trong một bước. Chạy trực tiếp ví dụ trong [hướng dẫn](HUONG-DAN.md#3-kiểm-chứng-headless-và-lưu-bằng-chứng) để quan sát thứ tự sự kiện.

## Harness kiểm chứng

`AGENTS.md` ghi lệnh và quy ước cần giữ khi sửa luật. Skill `verify-game` hướng dẫn chạy kiểm chứng, đọc bằng chứng thô và nhờ người hoặc agent khác rà soát. Workflow GitHub Actions cấu hình chạy test khi có push hoặc pull request. Hook pre-commit đã cài trên bản làm việc và chạy test trước commit. Bản clone khác có thể kích hoạt hook bằng `npm run install-hooks`. [AGENTS](../AGENTS.md) · [Skill](../.agents/skills/verify-game/SKILL.md) · [Workflow](../.github/workflows/verify.yml)

## Nhật ký sử dụng AI

| Công việc | Cách dùng AI | Kiểm tra chéo và giới hạn |
|---|---|---|
| Tìm nguồn đề và quy định | Codex rà soát repo, tài liệu lab và GitHub upstream | Xác nhận nguồn chính của yêu cầu chi tiết là lab board. Repo chỉ cung cấp mô tả tổng quát và quy định nộp bài. |
| Thiết kế bằng chứng | Đọc rubric và chuyển thành bảng yêu cầu, kiểm chứng và bằng chứng theo phase | Kết quả chỉ được điền sau khi chạy thực tế và lưu đầu ra. |
| Viết hướng dẫn | Tách thao tác chơi, kiểm chứng, quay demo và phát hành thành các bước | Đối chiếu tên nút, phím, lệnh CLI và ca kiểm thử trong mã hiện có. |
| Rà soát độc lập | Agent khác chạy lại bộ test và tái lập stdout của ba scenario | Kiểm tra cách gắn log vào bản mã, trường hợp cả hai lần chạy đều lỗi và tình trạng bằng chứng cũ sau khi lần chạy mới thất bại. |

Cách giảm ngữ cảnh là phân vai đọc đề, triển khai và rà soát, đồng thời dùng đường dẫn tới các tài liệu thay vì chép toàn bộ đề vào mỗi lượt. Ước lượng lượt đọc tài liệu chung và soạn hướng dẫn, báo cáo là khoảng 12.000 token văn bản, dùng quy đổi thô bốn ký tự Unicode mỗi token trên nội dung các tài liệu. Số này chỉ bao gồm công việc tài liệu của bản thử và chưa đo được số token tính phí. Chưa phân bổ theo phase vì chưa có các vòng triển khai dựa trên PRD-0 và Ticket-02/03/04.

## Đánh giá và retro

Bắt đầu từ test contract giúp khóa giao diện được chấm trước khi bổ sung mỹ thuật. Một vướng mắc đã phát hiện là tiêu đề chung trong repo có thể bị nhầm với đề chi tiết từng phase. Việc đối chiếu README với lab board là bước xác minh trước khi coi một con số hoặc quy tắc là yêu cầu chính thức.

Rà soát tệp bằng chứng phát hiện bản triển khai đầu chưa đưa CLI vào định danh mã nguồn, và một lần chạy lỗi có thể để lại tóm tắt tốt từ lần trước. Công cụ kiểm chứng đã bổ sung CLI, máy chủ và cấu hình vào mã băm, đồng thời xóa tóm tắt cũ trước khi chạy. Việc chạy test nêu đích danh hai tệp để thiếu tệp kiểm thử sẽ tạo lỗi. [Công cụ kiểm chứng](../tools/verify.mjs)

Ảnh thử màn thắng cho thấy dòng gợi ý đi đến đèn kế tiếp vẫn hiện khi cả ba đèn đã sáng. Giao diện đã sửa để ẩn hướng dẫn di chuyển khi ván kết thúc. Lượt sau cần kiểm tra cả HUD lúc chơi lẫn sau thắng hoặc thua. [Mã giao diện](../web/game-ui.mjs)

Khi nhận được tài liệu từng phase, ghi lại yêu cầu đã đạt, kết quả hồi quy và thay đổi do ticket. Giảng viên đối chiếu ngưỡng trên máy chấm và chạy bộ kiểm thử ẩn.

[Hướng dẫn tự chạy và trình bày](HUONG-DAN.md) · [Rubric](../RUBRIC.md) · [Checklist nộp bài](../SUBMISSION.md)
