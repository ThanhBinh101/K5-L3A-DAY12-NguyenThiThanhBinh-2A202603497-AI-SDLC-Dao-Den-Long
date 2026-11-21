# Đảo Đèn Lồng

- Dùng Node.js 20+. `npm start` để chạy game, `npm test` để test, `npm run verify` để lưu bằng chứng.
- Browser và CLI cùng dùng logic ở `src/game.mjs` theo tick cố định. Mã trong `web/` vẽ trạng thái, không tự áp luật game.
- Biết yêu cầu từ ticket nào trước khi sửa. Luật do nhóm tự chọn phải được phân biệt với Test Contract chính thức.
- Headless ghi JSONL tới tệp --out, lỗi ghi stderr. Format inputs/scenario sai trả 2.
- Sau khi sửa luật hoặc input/output, chạy skill verify-game và mời người/agent khác review bằng chứng.
- Hook do `npm run install-hooks` cài sẽ chặn commit khi test lỗi. Không bỏ qua check để gắn tag.
- Tài liệu, asset và minh chứng phải khớp mã. Không dùng lại minh chứng cũ để chứng minh hành vi đã đổi.

Từ v1.1, giữ tick gameplay tách riêng tick input. Đối chiếu thứ tự tick và tọa độ bản đồ trong Ticket-02 trước khi sửa.
