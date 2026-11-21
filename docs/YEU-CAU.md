# Yêu cầu và tiêu chí nghiệm thu Day 12

Đề gốc gồm PRD-0, Ticket-02, Ticket-03 và Ticket-04. Bản tóm tắt này giúp truy vết luật thay đổi theo phase. Dùng `game.contract.json` ở từng tag để đọc đúng thông số của phiên bản chạy. [Lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)

| Phase | Contract | Tiêu chí để tự kiểm |
|---|---|---|
| 1 | v1.0 | Game 3D góc nhìn thứ ba, một đêm có năm đèn. Mây nhặt đom đóm, góp dần vào đèn và dùng xung làm choáng Bóng Mực. Khi toàn bộ đèn sáng thì thắng ngay. Hết thời gian hoặc hết lửa thì thua. Khai báo thông số được chọn và chạy mô phỏng JSONL theo seed. |
| 2 | v1.1 | Ba đêm có 5, 6 và 7 đèn. Kiểm tra di chuyển theo camera, nhảy, lướt, va chạm, rơi, xung, gió, Drifter, bùa và tạm dừng. Chạy lại ca góp đom đóm, thắng khi thắp hết và tính tất định. |
| 3 | v1.2 | Đèn đã thắp có nhiên liệu và có thể tắt, thắp lại. Điểm, sức chứa và điều kiện thắng đổi theo Ticket-03. Thắp hết đèn trong lúc còn giờ chỉ làm tăng ánh sáng. Xét thắng ở bình minh theo số đèn còn sáng. |
| 4 | v1.3 | Giữ luật v1.2. Thêm bảng điểm, hỗ trợ tiếp cận, quy trình đóng gói, phép đo benchmark và soak đúng lệnh. Đo trên môi trường được mô tả và giữ đầu ra thô. |

## Phase 1 · Mô phỏng và kiểm chứng

- Đầu vào gồm seed, đêm, scenario, chuỗi khung điều khiển, số tick, chu kỳ snapshot và đường dẫn tệp kết quả. Tệp điều khiển là một đối tượng JSON có mảng `frames`. Mỗi frame khai báo `tick` và những trường cần đổi. Giá trị di chuyển và góc camera được giữ đến khi có frame cập nhật.
- Scenario có thể ghi đè vị trí, lửa và đom đóm mang theo của Mây, mảng đom đóm, mảng Bóng Mực, thời gian còn lại và thuộc tính đèn theo ID. Có thể tắt sinh ngẫu nhiên bằng `random_motes` và `random_shades`. Thiết lập scenario chỉ dựng trạng thái đầu.
- Kết quả là JSONL. Snapshot có `tick`, `sim_tick`, `state`, `time_left_s`, `score`, trạng thái Mây, đèn, Bóng Mực và số đom đóm hiện tại. Snapshot đầu ở tick 0. Vị trí là bộ ba XYZ, xuất đến ba chữ số thập phân. Dòng `end` nằm cuối.
- Kịch bản tối thiểu gồm chạy lặp cùng seed, đổi góc camera, nhặt một đom đóm, góp khi còn thiếu, thắp đèn cuối, và thử cờ sai định dạng. Kiểm payload `mote_picked`, `deposit`, `lantern_lit`, `pulse`, `player_hit`, `shade_spawned`, `game_over` theo phase.

## Phase 2 · Thông số chuẩn hóa

| Nhóm | Luật cần kiểm |
|---|---|
| Đêm | Số đèn lần lượt 5/6/7. Giới hạn thời gian lần lượt 300/330/360 giây. Night 1 có cụm đèn tại `[0,0,25]`, `[23.8,0,7.7]`, `[14.7,0,-20.2]`, `[-14.7,0,-20.2]`, `[-23.8,0,7.7]`. |
| Di chuyển | Tốc độ 6, nhảy 7, gia tốc rơi −20. Lướt tốc độ 14 trong 0,2 giây, hồi 1,5 giây. Chuẩn hóa đầu vào chéo và quay theo góc camera. |
| Nhặt và góp | Sức chứa 10. Phạm vi nhặt theo mặt phẳng XZ là 1, chênh cao tối đa 1,5. Đến trong bán kính 2 rồi góp tối đa số cần để đạt 10. |
| Xung và đèn | Xung tốn 3 đom đóm, bán kính 5, hồi 3 giây. Bóng Mực choáng 120 tick, bị đẩy 4 đơn vị trong 15 tick. Khi trùng vị trí, đẩy theo +X. Bán kính an toàn quanh đèn sáng là 6. |
| Trúng đòn và rơi | Có 3 lửa. Trúng đòn làm rơi một nửa số đom đóm, lấy phần nguyên, miễn nhiễm 90 tick và bật lùi 2 đơn vị trong 60 tick. Rơi dưới Y = −10 mất một lửa, rơi hết đom đóm, hồi lại tại gốc sau 60 tick và được miễn nhiễm 90 tick. |
| Tạm dừng | Tick đầu ra vẫn tăng. `sim_tick`, thời gian, chuyển động và hồi chiêu đứng yên. Các nút hành động được xử lý theo cạnh nhấn. |
| Trạng thái ghi thêm | Snapshot thêm đêm, gió, vận tốc, tiếp đất, cờ miễn nhiễm Boolean, hồi chiêu, bùa, đom đóm, Drifter và bùa ở bản đồ. Scenario cho phép bật tắt gió và Drifter để tạo ca cô lập. |

## Phase 3 · Thay đổi luật và hồi quy

| Chủ đề | Luật v1.2 |
|---|---|
| Nhiên liệu | Đèn sáng hao 1 đơn vị mỗi giây theo tick cố định. Dưới 30 là ánh sáng yếu. Hết nhiên liệu thì tắt và đặt lại phần góp, lưu lịch sử đã từng sáng. Đèn đã tắt cần 5 đom đóm để thắp lại. Góp thêm khi sáng làm tăng 10 nhiên liệu mỗi đom đóm. Bóng Mực đang hút lấy 5 nhiên liệu mỗi giây. |
| Sức chứa | Bắt đầu từ 10. Tăng 2 theo lần thắp thành công, tối đa 20. |
| Kết thúc | Đêm kéo dài 240/270/300 giây. Tới bình minh, phải còn ít nhất `ceil(0.6 × số đèn)` đèn sáng. Nếu đồng thời hết lửa thì xử lý hết lửa trước. |
| Điểm | Góp hoặc tiếp nhiên liệu +5 mỗi đom đóm. Thắp lần đầu +100, thắp lại +40. Xung +5 cho mỗi Bóng Mực được làm choáng hoặc +15 nếu nó đang hút nhiên liệu. Tại bình minh cộng `50 + floor(fuel)` cho mỗi đèn còn sáng và +50 cho mỗi lửa còn lại. |
| Hợp đồng | Đèn thêm `fuel`, `ever_lit`, `relit_count`. Mây thêm `capacity`. Sự kiện thêm `refuel`, `lantern_out`, `fuel_drain` sau mỗi 60 tick hút và cờ `relight` trên `lantern_lit`. Kết quả bình minh thêm `dawn_survived`. |

Ca kỳ vọng thắng ngay khi thắp đèn cuối được thay thế bằng hai kiểm tra. V1.0 và v1.1 vẫn phải thắng ngay. V1.2 trở đi giữ trạng thái đang chơi ở cùng đầu vào và xét thắng ở lúc hết giờ. Các ca camera, nhặt, góp, đầu vào sai và tính tất định tiếp tục được chạy.

## Phase 4 · Phát hành và số đo

- Benchmark dùng seed 42, 30 giây, khung 1280×720, 200 Bóng Mực đi lang thang, 100 đom đóm và ba đèn bắt đầu với nhiên liệu 100. Có 3 giây làm nóng. Ghi số đo thực, cùng mục tiêu FPS trung bình ít nhất 60, p1 low ít nhất 30 và thời gian tải tối đa 10 giây.
- Soak dùng seed 7, 10 đêm. Kiểm tra không crash và mức tăng RSS tối đa 20%.
- Bảng điểm giữ tối đa 10 kết quả. Tên dùng 3–12 ký tự ASCII, gồm chữ cái, chữ số hoặc dấu gạch dưới. Sắp theo điểm giảm dần, đồng điểm lấy thời gian ISO sớm hơn. Mỗi dòng có `name`, `score`, `nights_won`, `achieved_at` và `seed`. Dùng CLI máy chủ để xuất dữ liệu.
- Hoàn thiện khả năng tiếp cận và mô tả lệnh chạy. Lưu số đo, ảnh hoặc video và bằng chứng headless. Đóng gói bản chạy và gắn đúng commit ở tag `phase-4`, sau đó tạo GitHub Release `v1.0.0`. Các phép đo cục bộ cần ghi rõ máy và phiên bản.
