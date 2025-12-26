# LAN Speed Test (Web)

Project demo đo tốc độ mạng LAN (ping / download / upload) với UI cải tiến và đồ thị thời gian thực.

Yêu cầu
- Node.js 16+
- Máy chạy server và client phải ở cùng mạng LAN; server lắng nghe port mặc định 3000.

Cách chạy
1. Cài dependencies:
   npm install
2. Chạy server:
   npm start
3. Trên máy client trong cùng mạng, mở trình duyệt tới:
   http://<IP-của-server>:3000
   (Nếu bạn truy cập từ chính máy server, có thể mở http://localhost:3000)

Hướng dẫn dùng
- Nhập IP:port của server vào ô "Server" nếu truy cập từ máy client khác (ví dụ `192.168.1.10:3000`).
- Chọn thời lượng (giây), số kết nối song song (parallel) và kích thước chunk (KB).
- Bấm "Bắt đầu" để chạy test. Kết quả tải lên/tiền về hiển thị bằng Mbps theo giây trên đồ thị.

Ghi chú & cải tiến có thể thêm
- Hiện tại dùng WebSocket để stream binary frames (download từ server, upload từ client).
- Có thể cải thiện:
  - Tính trung bình/percentile nhiều lần test (repeat).
  - Thống kê jitter và packet loss (phù hợp UDP/WebRTC).
  - Thay WebSocket bằng WebRTC DataChannel để tránh một số overhead hoặc để đo UDP-like path.
  - Thêm chế độ server CLI headless để test tự động.
  - Thêm chế độ đa luồng TCP riêng biệt (nhiều TCP sockets) cho độ chính xác cao hơn.

An toàn & lưu ý
- Đây là bản demo: không lưu file upload, server chỉ đếm bytes.
- Tránh chạy kích thước/chunks quá lớn trên máy yếu; điều chỉnh `parallel` và `chunkSize` nếu thấy lag.
